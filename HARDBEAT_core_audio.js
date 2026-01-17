/* ==========================================
   HARDBEAT PRO - CORE AUDIO (PASSIVE TOOLBOX)
   ========================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- MASTER CHAIN ---
const masterLimiter = audioCtx.createWaveShaper();
function makeSoftClipCurve(amount = 0) {
    let k = typeof amount === 'number' ? amount : 50;
    let n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0;
    for ( ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) ); 
    }
    return curve;
}
masterLimiter.curve = makeSoftClipCurve(0); masterLimiter.oversample = '4x';
const masterGain = audioCtx.createGain();
masterGain.connect(masterLimiter); masterLimiter.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

// --- EFFETS ---
const distoNode2 = audioCtx.createWaveShaper();
const distoNode3 = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

function createDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 0;
    let n_samples = 2048, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0;
    for ( ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;
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

// --- API EFFETS ---
window.updateAudioEffect = function(type, val) {
    if (type === 'disto2') distoNode2.curve = createDistortionCurve(val);
    if (type === 'disto3') distoNode3.curve = createDistortionCurve(val);
    if (type === 'delayAmt') {
        delayMix.gain.setTargetAtTime(val, audioCtx.currentTime, 0.02);
        feedback.gain.setTargetAtTime(val * 0.7, audioCtx.currentTime, 0.02);
    }
    if (type === 'delayTime') {
        delayNode.delayTime.setTargetAtTime(val, audioCtx.currentTime, 0.02);
    }
};

window.ensureAudioContext = function() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
};

// --- FONCTIONS DE JEU (Reçoivent tout en argument) ---

window.playMetronome = function(isDownbeat) { 
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(masterGain); 
    osc.frequency.value = isDownbeat ? 1200 : 800; g.gain.setValueAtTime(0.3, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); osc.start(); osc.stop(audioCtx.currentTime + 0.05); 
};

window.playKick = function(settings, isAccent, boost) { 
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(masterGain); 
    let lvl = settings.level; let decayMod = settings.decay; 
    if (isAccent) { lvl = Math.min(1.2, lvl * boost); decayMod += 0.1; } 
    osc.frequency.setValueAtTime(settings.pitch, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + decayMod); 
    g.gain.setValueAtTime(lvl, audioCtx.currentTime); 
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + decayMod); 
    osc.start(); osc.stop(audioCtx.currentTime + decayMod); 
};

window.playSnare = function(settings, isAccent, boost) { 
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; 
    const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filt = audioCtx.createBiquadFilter(); filt.type = 'highpass'; 
    let baseTone = settings.tone; let lvl = settings.level; let snap = settings.snappy; 
    if (isAccent) { lvl = Math.min(1.2, lvl * boost); baseTone += 200; snap += 0.2; } 
    filt.frequency.value = baseTone; const g = audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); 
    g.gain.setValueAtTime(lvl, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (0.2 * snap)); noise.start(); 
};

window.playHiHat = function(settings, isOpen, isAccent, boost) { 
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; 
    const noise = audioCtx.createBufferSource(); noise.buffer = buffer; const filt = audioCtx.createBiquadFilter(); filt.type = 'highpass'; 
    let tone = settings.tone; let d = isOpen ? settings.decayOpen : settings.decayClose; let l = isOpen ? settings.levelOpen : settings.levelClose; 
    if (isAccent) { l = Math.min(1.0, l * boost); d += 0.05; tone += 500; } 
    filt.frequency.value = tone; const g = audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); 
    g.gain.setValueAtTime(l, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d); noise.start(); 
};

window.playDrumFM = function(settings, isAccent, boost) { 
    const car = audioCtx.createOscillator(); const mod = audioCtx.createOscillator(); const modG = audioCtx.createGain(); const mainG = audioCtx.createGain(); 
    mod.frequency.value = settings.modPitch; let amt = settings.fmAmount; let lvl = settings.level; let d = settings.decay; 
    if (isAccent) { lvl = Math.min(1.0, lvl * boost); amt += 50; d += 0.1; } 
    modG.gain.value = amt; car.frequency.value = settings.carrierPitch; mod.connect(modG); modG.connect(car.frequency); car.connect(mainG); mainG.connect(masterGain); 
    mainG.gain.setValueAtTime(lvl, audioCtx.currentTime); mainG.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d); car.start(); mod.start(); car.stop(audioCtx.currentTime + d); mod.stop(audioCtx.currentTime + d); 
};

window.playSynthNote = function(freq, volume, seqId, params) {
    if (!freq || freq < 20) return;
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
    vca.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + params.decay);
    
    osc.start(); osc.stop(audioCtx.currentTime + params.decay + 0.1);
};

console.log("Audio Engine : Prêt (Passive Mode).");
