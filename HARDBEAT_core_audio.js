/* ==========================================
   HARDBEAT PRO - CORE AUDIO ENGINE
   ========================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

let isPlaying = false;
let currentStep = 0;
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let synthSequences = { seq2: Array(16).fill(false), seq3: Array(16).fill(false) };

// Paramètres de synthèse sécurisés
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };
let synthParams = { disto: 400, resonance: 12, cutoffEnv: 4, delayAmt: 0.3, delayTime: 0.375 };

// --- CHAINE D'EFFETS SYNTH ---
const distortionNode = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

function createDistortionCurve(amount = 50) {
    let n_samples = 44100, curve = new Float32Array(n_samples);
    for (let i = 0 ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + amount ) * x * 20 * (Math.PI / 180) / ( Math.PI + amount * Math.abs(x) );
    }
    return curve;
}

distortionNode.curve = createDistortionCurve(synthParams.disto);
distortionNode.connect(masterGain); 
distortionNode.connect(delayNode);
delayNode.connect(feedback); feedback.connect(delayNode);
delayNode.connect(delayMix); delayMix.connect(masterGain);

// --- FONCTIONS DE SYNTHÈSE ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(masterGain);
    osc.frequency.setValueAtTime(kickSettings.pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    gain.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    osc.start(); osc.stop(audioCtx.currentTime + kickSettings.decay);
}

function playSynthNote(frequency, duration = 0.2) {
    if (!frequency || frequency <= 0) return;
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const vca = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.Q.value = synthParams.resonance;
    filter.frequency.setValueAtTime(frequency * synthParams.cutoffEnv, audioCtx.currentTime);
    
    osc.connect(filter); filter.connect(vca); vca.connect(distortionNode);
    
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function checkSynthTick(step) {
    if (synthSequences.seq2[step]) {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        if (faders[step]) playSynthNote(parseFloat(faders[step].value));
    }
}
