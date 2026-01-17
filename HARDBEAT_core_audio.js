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

// Paramètres de synthèse
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };
let synthParams = { disto: 400, resonance: 12, cutoffEnv: 4, delayAmt: 0.3, delayTime: 0.375 };

// --- EFFETS ---
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
distortionNode.connect(masterGain); distortionNode.connect(delayNode);
delayNode.connect(feedback); feedback.connect(delayNode);
delayNode.connect(delayMix); delayMix.connect(masterGain);

// --- SYNTHÈSE DRUMS ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.frequency.setValueAtTime(kickSettings.pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    g.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + kickSettings.decay);
    osc.start(); osc.stop(audioCtx.currentTime + kickSettings.decay);
}

// --- SYNTHÈSE SYNTH (Avec enveloppe courte pour éviter le grincement) ---
function playSynthNote(freq) {
    if (!freq || freq <= 0) return;
    const osc = audioCtx.createOscillator();
    const vca = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.Q.value = synthParams.resonance;
    filter.frequency.setValueAtTime(freq * synthParams.cutoffEnv, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + 0.1);

    osc.connect(filter); filter.connect(vca); vca.connect(distortionNode);
    
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); // Durée fixe courte
    
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}
