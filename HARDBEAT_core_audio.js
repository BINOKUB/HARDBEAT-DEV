/* ==========================================
   HARDBEAT PRO - CORE AUDIO (SYNTH MUTES)
   ========================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const masterLimiter = audioCtx.createWaveShaper();
function makeSoftClipCurve(amount = 0) {
    let k = typeof amount === 'number' ? amount : 50;
    let n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0, x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) ); 
    }
    return curve;
}
masterLimiter.curve = makeSoftClipCurve(0);
masterLimiter.oversample = '4x';

const masterGain = audioCtx.createGain();
masterGain.connect(masterLimiter);
masterLimiter.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

let isPlaying = false;
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let drumAccents = Array.from({ length: 5 }, () => Array(16).fill(false));
let synthSequences = { seq2: Array(16).fill(false), seq3: Array(16).fill(false) };

let freqCacheSeq2 = new Array(16).fill(440);
let freqCacheSeq3 = new Array(16).fill(220);

// ÉTATS MUTE SYNTH
let isMutedSeq2 = false;
let isMutedSeq3 = false;

let synthVol2 = 0.6;
let synthVol3 = 0.6;
let globalAccentBoost = 1.4;

let paramsSeq2 = { disto: 0, res: 5, cutoff: 4, decay: 0.2 };
let paramsSeq3 = { disto: 200, res: 8, cutoff: 2, decay: 0.4 };
let globalDelay = { amt: 0, time: 0.375 };

let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

const distoNode2 = audioCtx.createWaveShaper();
const distoNode3 = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

function createDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 0;
    let n_samples = 2048, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0, x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
}

distoNode2.curve = createDistortionCurve(0);
distoNode3.curve = createDistortionCurve(200);
distoNode2.connect(masterGain); distoNode2.connect(delayNode);
distoNode3.connect(masterGain); distoNode3.connect(delayNode);
delayNode.connect(feedback); feedback.connect(delayNode); delayNode.connect(delayMix); delayMix.connect(masterGain);
feedback.gain.value = 0; delayMix.gain.value = 0;

// API WINDOW
window.updateSynth2Disto = function(val) { paramsSeq2.disto = val; if(audioCtx.state==='running') distoNode2.curve = createDistortionCurve(val); };
window.updateSynth2Res = function(val) { paramsSeq2.res = val; };
window.updateSynth2Cutoff = function(val) { paramsSeq2.cutoff = val; };
window.updateSynth2Decay = function(val) { paramsSeq2.decay = val; };

window.updateSynth3Disto = function(val) { paramsSeq3.disto = val; if(audioCtx.state==='running') distoNode3.curve = createDistortionCurve(val); };
window.updateSynth3Res = function(val) { paramsSeq3.res = val; };
window.updateSynth3Cutoff = function(val) { paramsSeq3.cutoff = val; };
window.updateSynth3Decay = function(val) { paramsSeq3.decay = val; };

window.updateDelayAmount = function(val) { globalDelay.amt = val; delayMix.gain.setTargetAtTime(val, audioCtx.currentTime, 0.02); feedback.gain.setTargetAtTime(val * 0.7, audioCtx.currentTime, 0.02); };
window.updateDelayTime = function(val) { globalDelay.time = val; delayNode.delayTime.setTargetAtTime(val, audioCtx.currentTime, 0.02); };
window.updateAccentBoost = function(val) { globalAccentBoost = val; };
window.updateFreqCache = function(seqId, stepIndex, val) { if (seqId === 2) freqCacheSeq2[stepIndex] = val; if (seqId === 3) freqCacheSeq3[stepIndex] = val; };

// FONCTIONS MUTE SYNTH (Appelées par UI)
window.toggleMuteSynth = function(seqId, isMuted) {
    if (seqId === 2) isMutedSeq2 = isMuted;
    if (seqId === 3) isMutedSeq3 = isMuted;
};

// DRUMS (Inchangé)
function playMetronome(isDownbeat) { const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(masterGain); osc.frequency.value = isDownbeat ? 1200 : 800; g.gain.setValueAtTime(0.3, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); osc.start(); osc.stop(audioCtx.currentTime + 0.05); }
function playKick(isAccent) { const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(masterGain); let lvl = kickSettings.level; let decayMod = kickSettings.decay; if (isAccent) { lvl = Math.min(1.2, lvl * globalAccentBoost); decayMod += 0.1; } osc.frequency.setValueAtTime(kickSettings.pitch || 150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + decayMod); g.gain.setValueAtTime(lvl, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + decayMod); osc.start(); osc.stop(audioCtx.currentTime + decayMod); }
function playSnare(isAccent) { const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filt = audioCtx.createBiquadFilter(); filt.type = 'highpass'; let baseTone = snareSettings.tone || 1000; let lvl = snareSettings.level; let snap = snareSettings.snappy || 1; if (isAccent) { lvl = Math.min(1.2, lvl * globalAccentBoost); baseTone += 200; snap += 0.2; } filt.frequency.value = baseTone; const g = audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); g.gain.setValueAtTime(lvl, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (0.2 * snap)); noise.start(); }
function playHiHat(isOpen, isAccent) { const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filt = audioCtx.createBiquadFilter(); filt.type = 'highpass'; let tone = hhSettings.tone || 8000; let d = isOpen ? (hhSettings.decayOpen || 0.3) : (hhSettings.decayClose || 0.05); let l = isOpen ? (hhSettings.levelOpen || 0.5) : (hhSettings.levelClose || 0.4); if (isAccent) { l = Math.min(1.0, l * globalAccentBoost); d += 0.05; tone += 500; } filt.frequency.value = tone; const g = audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); g.gain.setValueAtTime(l, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d); noise.start(); }
function playDrumFM(isAccent) { const car = audioCtx.createOscillator(); const mod = audioCtx.createOscillator(); const modG = audioCtx.createGain(); const mainG = audioCtx.createGain(); mod.frequency.value = fmSettings.modPitch || 50; let amt = fmSettings.fmAmount || 100; let lvl = fmSettings.level || 0.5; let d = fmSettings.decay || 0.3; if (isAccent) { lvl = Math.min(1.0, lvl * globalAccentBoost); amt += 50; d += 0.1; } modG.gain.value = amt; car.frequency.value = fmSettings.carrierPitch || 100; mod.connect(modG); modG.connect(car.frequency); car.connect(mainG); mainG.connect(masterGain); mainG.gain.setValueAtTime(lvl, audioCtx.currentTime); mainG.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d); car.start(); mod.start(); car.stop(audioCtx.currentTime + d); mod.stop(audioCtx.currentTime + d); }

// SYNTH
function playSynthNote(freq, volume, seqId) {
    if (!freq || freq < 20) return;
    const targetVol = (typeof volume === 'number') ? volume : 0.5;
    const params = (seqId === 3) ? paramsSeq3 : paramsSeq2;
    const targetNode = (seqId === 3) ? distoNode3 : distoNode2;

    const osc = audioCtx.createOscillator();
    const vca = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.Q.value = params.res;
    filter.frequency.setValueAtTime(freq * params.cutoff, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + 0.1);

    osc.connect(filter); filter.connect(vca); vca.connect(targetNode);
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(targetVol, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + params.decay);
    osc.start(); osc.stop(audioCtx.currentTime + params.decay + 0.1);
}

function checkSynthTick(step) {
    // Vérification des mutes avant de jouer
    if (!isMutedSeq2 && synthSequences.seq2[step]) playSynthNote(freqCacheSeq2[step], synthVol2, 2);
    if (!isMutedSeq3 && synthSequences.seq3[step]) playSynthNote(freqCacheSeq3[step] * 0.5, synthVol3, 3);
}

console.log("Audio Engine : Prêt (Synth Mute Ready).");
