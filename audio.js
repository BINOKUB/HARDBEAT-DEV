/* ==========================================
   HARDBEAT PRO - AUDIO ENGINE (V8 - SYNTH ACCENTS)
   ========================================== */
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.masterGain = window.audioCtx.createGain();

// Limiter / Clipper pour le son "Hard"
const masterLimiter = window.audioCtx.createWaveShaper();
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

masterGain.connect(masterLimiter);
masterLimiter.connect(window.audioCtx.destination);
masterGain.gain.value = 0.5;

// --- ETAT GLOBAL ---
window.isPlaying = false;
window.globalAccentBoost = 1.4; // Multiplicateur de volume pour l'accent

window.kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
window.snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
window.hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
window.fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

window.paramsSeq2 = { disto: 0, res: 5, cutoff: 4, decay: 0.2 };
window.paramsSeq3 = { disto: 200, res: 8, cutoff: 2, decay: 0.4 };
window.globalDelay = { amt: 0, time: 0.375 };

window.synthVol2 = 0.6;
window.synthVol3 = 0.6;
window.isMutedSeq2 = false;
window.isMutedSeq3 = false;

// --- FX ---
const distoNode2 = window.audioCtx.createWaveShaper();
const distoNode3 = window.audioCtx.createWaveShaper();
const delayNode = window.audioCtx.createDelay(2.0);
const feedback = window.audioCtx.createGain();
const delayMix = window.audioCtx.createGain();

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

// --- API ---
window.updateSynth2Disto = function(val) { window.paramsSeq2.disto = val; if(window.audioCtx.state==='running') distoNode2.curve = createDistortionCurve(val); };
window.updateSynth2Res = function(val) { window.paramsSeq2.res = val; };
window.updateSynth2Cutoff = function(val) { window.paramsSeq2.cutoff = val; };
window.updateSynth2Decay = function(val) { window.paramsSeq2.decay = val; };
window.updateSynth3Disto = function(val) { window.paramsSeq3.disto = val; if(window.audioCtx.state==='running') distoNode3.curve = createDistortionCurve(val); };
window.updateSynth3Res = function(val) { window.paramsSeq3.res = val; };
window.updateSynth3Cutoff = function(val) { window.paramsSeq3.cutoff = val; };
window.updateSynth3Decay = function(val) { window.paramsSeq3.decay = val; };
window.updateDelayAmount = function(val) { window.globalDelay.amt = val; delayMix.gain.setTargetAtTime(val, window.audioCtx.currentTime, 0.02); feedback.gain.setTargetAtTime(val * 0.7, window.audioCtx.currentTime, 0.02); };
window.updateDelayTime = function(val) { window.globalDelay.time = val; delayNode.delayTime.setTargetAtTime(val, window.audioCtx.currentTime, 0.02); };
window.updateAccentBoost = function(val) { window.globalAccentBoost = val; };
window.toggleMuteSynth = function(seqId, isMuted) { if (seqId === 2) window.isMutedSeq2 = isMuted; if (seqId === 3) window.isMutedSeq3 = isMuted; };

// --- PLAYBACK ---
window.playMetronome = function(isDownbeat) { const osc = window.audioCtx.createOscillator(); const g = window.audioCtx.createGain(); osc.connect(g); g.connect(masterGain); osc.frequency.value = isDownbeat ? 1200 : 800; g.gain.setValueAtTime(0.3, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.05); osc.start(); osc.stop(window.audioCtx.currentTime + 0.05); }
window.playKick = function(isAccent) { const osc = window.audioCtx.createOscillator(); const g = window.audioCtx.createGain(); osc.connect(g); g.connect(masterGain); let lvl = window.kickSettings.level; let decayMod = window.kickSettings.decay; if (isAccent) { lvl = Math.min(1.2, lvl * window.globalAccentBoost); decayMod += 0.1; } osc.frequency.setValueAtTime(window.kickSettings.pitch || 150, window.audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + decayMod); g.gain.setValueAtTime(lvl, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + decayMod); osc.start(); osc.stop(window.audioCtx.currentTime + decayMod); }
window.playSnare = function(isAccent) { const buffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.2, window.audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const noise = window.audioCtx.createBufferSource(); noise.buffer = buffer; const filt = window.audioCtx.createBiquadFilter(); filt.type = 'highpass'; let baseTone = window.snareSettings.tone || 1000; let lvl = window.snareSettings.level; let snap = window.snareSettings.snappy || 1; if (isAccent) { lvl = Math.min(1.2, lvl * window.globalAccentBoost); baseTone += 200; snap += 0.2; } filt.frequency.value = baseTone; const g = window.audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); g.gain.setValueAtTime(lvl, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + (0.2 * snap)); noise.start(); }
window.playHiHat = function(isOpen, isAccent) { const buffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.5, window.audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const noise = window.audioCtx.createBufferSource(); noise.buffer = buffer; const filt = window.audioCtx.createBiquadFilter(); filt.type = 'highpass'; let tone = window.hhSettings.tone || 8000; let d = isOpen ? (window.hhSettings.decayOpen || 0.3) : (window.hhSettings.decayClose || 0.05); let l = isOpen ? (window.hhSettings.levelOpen || 0.5) : (window.hhSettings.levelClose || 0.4); if (isAccent) { l = Math.min(1.0, l * window.globalAccentBoost); d += 0.05; tone += 500; } filt.frequency.value = tone; const g = window.audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); g.gain.setValueAtTime(l, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + d); noise.start(); }
window.playDrumFM = function(isAccent) { const car = window.audioCtx.createOscillator(); const mod = window.audioCtx.createOscillator(); const modG = window.audioCtx.createGain(); const mainG = window.audioCtx.createGain(); mod.frequency.value = window.fmSettings.modPitch || 50; let amt = window.fmSettings.fmAmount || 100; let lvl = window.fmSettings.level || 0.5; let d = window.fmSettings.decay || 0.3; if (isAccent) { lvl = Math.min(1.0, lvl * window.globalAccentBoost); amt += 50; d += 0.1; } modG.gain.value = amt; car.frequency.value = window.fmSettings.carrierPitch || 100; mod.connect(modG); modG.connect(car.frequency); car.connect(mainG); mainG.connect(masterGain); mainG.gain.setValueAtTime(lvl, window.audioCtx.currentTime); mainG.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + d); car.start(); mod.start(); car.stop(window.audioCtx.currentTime + d); mod.stop(window.audioCtx.currentTime + d); }

// --- PLAY SYNTH (UPDATED FOR ACCENTS) ---
function playSynthNote(freq, volume, seqId, isAccent) {
    if (!freq || freq < 20) return;
    
    // GESTION DE L'ACCENT
    let targetVol = (typeof volume === 'number') ? volume : 0.5;
    let cutoffMult = 1.0;
    
    if (isAccent) {
        targetVol = Math.min(1.0, targetVol * window.globalAccentBoost); // Volume Boost
        cutoffMult = 1.5; // Ouverture du filtre
    }

    const params = (seqId === 3) ? window.paramsSeq3 : window.paramsSeq2;
    const targetNode = (seqId === 3) ? distoNode3 : distoNode2;

    const osc = window.audioCtx.createOscillator();
    const vca = window.audioCtx.createGain();
    const filter = window.audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, window.audioCtx.currentTime);
    
    // FILTRE (Avec prise en compte de l'accent)
    filter.type = 'lowpass';
    filter.Q.value = params.res;
    
    let baseCutoff = freq * params.cutoff;
    if (isAccent) baseCutoff *= 1.5; // Le filtre s'ouvre plus fort !
    
    filter.frequency.setValueAtTime(baseCutoff, window.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq, window.audioCtx.currentTime + 0.1);

    osc.connect(filter); filter.connect(vca); vca.connect(targetNode);
    
    vca.gain.setValueAtTime(0, window.audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(targetVol, window.audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + params.decay);
    
    osc.start(); osc.stop(window.audioCtx.currentTime + params.decay + 0.1);
}

// PONT TRIGGER
window.playSynthStep = function(stepIndex, freqValue, seqId, isActive, isAccent) {
    if (seqId === 2 && window.isMutedSeq2) return;
    if (seqId === 3 && window.isMutedSeq3) return;
    
    if (isActive) {
        const vol = (seqId === 3) ? window.synthVol3 : window.synthVol2;
        playSynthNote(freqValue, vol, seqId, isAccent);
    }
};

// PONT PREVIEW
window.playSynthSound = function(seqId, freq, duration, slide, disto) {
    const vol = (seqId === 3) ? window.synthVol3 : window.synthVol2;
    playSynthNote(freq, vol, seqId, false); // Pas d'accent en preview
};

console.log("AUDIO V8: Accents Synths Activés !");
