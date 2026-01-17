/* ==========================================
   HARDBEAT PRO - CORE AUDIO ENGINE (OPTIMIZED)
   ========================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

let isPlaying = false;
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let synthSequences = { seq2: Array(16).fill(false), seq3: Array(16).fill(false) };

// --- SYSTÈME DE CACHE (POUR ÉVITER LE LAG) ---
// On stocke les valeurs ici pour ne pas avoir à lire le HTML en boucle
let freqCacheSeq2 = new Array(16).fill(440);
let freqCacheSeq3 = new Array(16).fill(220);

// Volumes
let synthVol2 = 0.6;
let synthVol3 = 0.6;

// Paramètres
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };
let synthParams = { disto: 0, resonance: 5, cutoffEnv: 4, delayAmt: 0, delayTime: 0.375 };

// --- EFFETS ---
const distortionNode = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

function createDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 0;
    // OPTIMISATION : On réduit les échantillons de 44100 à 2048. 
    // C'est 20x plus rapide et le son est identique pour une disto.
    let n_samples = 2048, 
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0, x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
}

// Fonction publique optimisée
window.updateDistortion = function(amount) {
    synthParams.disto = amount;
    // On ne recalcule pas si l'audio context est suspendu pour économiser
    if(audioCtx.state === 'running') {
        distortionNode.curve = createDistortionCurve(amount);
    }
};

// Fonctions de mise à jour du cache (appelées par UI)
window.updateFreqCache = function(seqId, stepIndex, val) {
    if (seqId === 2) freqCacheSeq2[stepIndex] = val;
    if (seqId === 3) freqCacheSeq3[stepIndex] = val;
};

// Init Effets
distortionNode.curve = createDistortionCurve(0);
distortionNode.connect(delayNode);
delayNode.connect(feedback); feedback.connect(delayNode);
delayNode.connect(delayMix);
distortionNode.connect(masterGain); delayMix.connect(masterGain);
feedback.gain.value = 0; delayMix.gain.value = 0;

// --- DRUMS (Inchangé) ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    const p = kickSettings.pitch || 150;
    const d = kickSettings.decay || 0.5;
    osc.frequency.setValueAtTime(p, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d);
    g.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    osc.start(); osc.stop(audioCtx.currentTime + d);
}
function playSnare() {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
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
function playHiHat(isOpen) {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = hhSettings.tone || 8000;
    const g = audioCtx.createGain();
    noise.connect(filt); filt.connect(g); g.connect(masterGain);
    const d = isOpen ? (hhSettings.decayOpen || 0.3) : (hhSettings.decayClose || 0.05);
    const l = isOpen ? (hhSettings.levelOpen || 0.5) : (hhSettings.levelClose || 0.4);
    g.gain.setValueAtTime(l, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    noise.start();
}
function playDrumFM() {
    const car = audioCtx.createOscillator();
    const mod = audioCtx.createOscillator();
    const modG = audioCtx.createGain();
    const mainG = audioCtx.createGain();
    mod.frequency.value = fmSettings.modPitch || 50;
    modG.gain.value = fmSettings.fmAmount || 100;
    car.frequency.value = fmSettings.carrierPitch || 100;
    mod.connect(modG); modG.connect(car.frequency);
    car.connect(mainG); mainG.connect(masterGain);
    const d = fmSettings.decay || 0.3;
    mainG.gain.setValueAtTime(fmSettings.level || 0.5, audioCtx.currentTime);
    mainG.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    car.start(); mod.start();
    car.stop(audioCtx.currentTime + d); mod.stop(audioCtx.currentTime + d);
}

// --- SYNTHS ---
function playSynthNote(freq, volume) {
    if (!freq || freq < 20) return;
    const targetVol = (typeof volume === 'number') ? volume : 0.5;
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
    vca.gain.linearRampToValueAtTime(targetVol, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function checkSynthTick(step) {
    // OPTIMISATION : On lit le CACHE au lieu de lire le HTML (beaucoup plus rapide)
    if (synthSequences.seq2[step]) {
        playSynthNote(freqCacheSeq2[step], synthVol2);
    }
    if (synthSequences.seq3[step]) {
        // Pour seq3, on applique le ratio 0.5 directement ici si on veut l'effet grave
        playSynthNote(freqCacheSeq3[step] * 0.5, synthVol3);
    }
}
console.log("Audio Engine : Prêt (Optimized V5).");
