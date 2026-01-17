/* ==========================================
   HARDBEAT PRO - CORE AUDIO ENGINE (SAFE MODE)
   ========================================== */
console.log("Audio Engine : Démarrage...");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

let isPlaying = false;
let currentStep = 0;
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let synthSequences = { seq2: Array(16).fill(false), seq3: Array(16).fill(false) };

// Paramètres par défaut
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };
let synthParams = { disto: 0, resonance: 5, cutoffEnv: 4, delayAmt: 0, delayTime: 0.375 }; // EFFETS À 0

// --- CHAINE D'EFFETS (BYPASSÉ PAR DÉFAUT) ---
const distortionNode = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

function createDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 0,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
}

distortionNode.curve = createDistortionCurve(0); // Pas de disto
distortionNode.connect(delayNode);
delayNode.connect(feedback);
feedback.connect(delayNode);
feedback.gain.value = 0; // Pas de feedback infini
delayNode.connect(delayMix);

// Route parallèle : Synth -> Disto -> Master ET Synth -> Delay -> Master
distortionNode.connect(masterGain);
delayMix.connect(masterGain);


// --- FONCTIONS DE LECTURE (DRUMS) ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    
    // Valeurs de sécurité
    const p = kickSettings.pitch || 150;
    const d = kickSettings.decay || 0.5;

    osc.frequency.setValueAtTime(p, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
    
    g.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    
    osc.start(); osc.stop(audioCtx.currentTime + d);
}

function playSnare() {
    const bufferSize = audioCtx.sampleRate * 0.2; // 200ms noise
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = snareSettings.tone || 1000;
    const g = audioCtx.createGain();
    
    noise.connect(filt); filt.connect(g); g.connect(masterGain);
    g.gain.setValueAtTime(snareSettings.level, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    
    noise.start();
}

// --- FONCTION SYNTHÉ (ANTI-GRINCEMENT) ---
function playSynthNote(freq) {
    if (!freq || freq < 20) return;
    
    const osc = audioCtx.createOscillator();
    const vca = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    filter.type = 'lowpass';
    filter.Q.value = synthParams.resonance;
    filter.frequency.setValueAtTime(freq * synthParams.cutoffEnv, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + 0.1);

    // Connexion : Osc -> Filter -> VCA -> Disto
    osc.connect(filter); filter.connect(vca); vca.connect(distortionNode);
    
    // Enveloppe VCA stricte (0.15s max)
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01); 
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    osc.start(); 
    osc.stop(audioCtx.currentTime + 0.2); // Arrêt forcé
}

// Fonction Tick Synthé
function checkSynthTick(step) {
    // Vérification que les tableaux existent
    if (synthSequences && synthSequences.seq2 && synthSequences.seq2[step]) {
        // On cherche le slider correspondant
        const fader = document.querySelector(`#grid-freq-seq2 .fader-unit:nth-child(${step+1}) input`);
        if (fader) playSynthNote(parseFloat(fader.value));
    }
}

console.log("Audio Engine : Prêt.");
