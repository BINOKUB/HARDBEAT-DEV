/* ==========================================
   HARDBEAT PRO - AUDIO ENGINE (V11 - STABLE FIX)
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

// --- FONCTION HI-HAT (Buffer de bruit) ---
const hhBuffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.5, window.audioCtx.sampleRate);
const hhData = hhBuffer.getChannelData(0);
for (let i = 0; i < hhData.length; i++) hhData[i] = Math.random() * 2 - 1;

// --- ETAT GLOBAL ---
window.isPlaying = false;
window.globalAccentBoost = 1.4; 

// DEFINITION DES REGLAGES (Essentiel pour que les sliders fonctionnent)
window.kickSettings = { pitch: 150, decay: 0.5, level: 0.8, rumble: 0 };
window.snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
window.hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
window.fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

window.paramsSeq2 = { disto: 0, res: 5, cutoff: 4, decay: 0.2 };
window.paramsSeq3 = { disto: 0, res: 8, cutoff: 2, decay: 0.4 };
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
distoNode3.curve = createDistortionCurve(0);
distoNode2.connect(masterGain); distoNode2.connect(delayNode);
distoNode3.connect(masterGain); distoNode3.connect(delayNode);
delayNode.connect(feedback); feedback.connect(delayNode); delayNode.connect(delayMix); delayMix.connect(masterGain);
feedback.gain.value = 0; delayMix.gain.value = 0;

// --- API (Liens avec Logic.js) ---
window.updateSynth2Disto = function(val) { 
    window.paramsSeq2.disto = val; 
    // On force la mise à jour immédiate de la courbe, même à l'arrêt
    distoNode2.curve = createDistortionCurve(val); 
};

window.updateSynth2Res = function(val) { window.paramsSeq2.res = val; };
window.updateSynth2Cutoff = function(val) { window.paramsSeq2.cutoff = val; };
window.updateSynth2Decay = function(val) { window.paramsSeq2.decay = val; };

window.updateSynth3Disto = function(val) { 
    window.paramsSeq3.disto = val; 
    // On force la mise à jour immédiate de la courbe, même à l'arrêt
    distoNode3.curve = createDistortionCurve(val); 
};

window.updateSynth3Res = function(val) { window.paramsSeq3.res = val; };
window.updateSynth3Cutoff = function(val) { window.paramsSeq3.cutoff = val; };
window.updateSynth3Decay = function(val) { window.paramsSeq3.decay = val; };

window.updateDelayAmount = function(val) { window.globalDelay.amt = val; delayMix.gain.setTargetAtTime(val, window.audioCtx.currentTime, 0.02); feedback.gain.setTargetAtTime(val * 0.7, window.audioCtx.currentTime, 0.02); };
window.updateDelayTime = function(val) { window.globalDelay.time = val; delayNode.delayTime.setTargetAtTime(val, window.audioCtx.currentTime, 0.02); };
window.updateAccentBoost = function(val) { window.globalAccentBoost = val; };
window.toggleMuteSynth = function(seqId, isMuted) { if (seqId === 2) window.isMutedSeq2 = isMuted; if (seqId === 3) window.isMutedSeq3 = isMuted; };



// --- PLAYBACK ENGINE ---
window.playMetronome = function(isDownbeat) { const osc = window.audioCtx.createOscillator(); const g = window.audioCtx.createGain(); osc.connect(g); g.connect(masterGain); osc.frequency.value = isDownbeat ? 1200 : 800; g.gain.setValueAtTime(0.3, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.05); osc.start(); osc.stop(window.audioCtx.currentTime + 0.05); }

// 1. KICK
window.playKick = function(isAccent) {
    const t = window.audioCtx.currentTime;
    
    // --- KICK CLEAN ---
    const osc = window.audioCtx.createOscillator();
    const g = window.audioCtx.createGain();
    
    osc.connect(g);
    g.connect(masterGain);

    let lvl = window.kickSettings.level;
    let decayMod = window.kickSettings.decay;

    if (isAccent) {
        lvl = Math.min(1.2, lvl * window.globalAccentBoost);
        decayMod += 0.1;
    }

    osc.frequency.setValueAtTime(window.kickSettings.pitch || 150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + decayMod);

    g.gain.setValueAtTime(lvl, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decayMod);

    osc.start(t);
    osc.stop(t + decayMod + 0.5);

    // --- RUMBLE ENGINE ---
    if (window.kickSettings.rumble && window.kickSettings.rumble > 0.05) {
        const rumbleGain = window.audioCtx.createGain();
        const rumbleFilter = window.audioCtx.createBiquadFilter();
        const rumbleDelay = window.audioCtx.createDelay();
        const rumbleDisto = window.audioCtx.createWaveShaper();

        rumbleDelay.delayTime.value = 0.03; 

        function makeDistortionCurve(amount) {
            let k = amount, n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0, x;
            for ( ; i < n_samples; ++i ) {
                x = i * 2 / n_samples - 1;
                curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
            }
            return curve;
        }
        rumbleDisto.curve = makeDistortionCurve(50);
        rumbleDisto.oversample = '2x';

        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 120;

        rumbleGain.gain.setValueAtTime(window.kickSettings.rumble * 0.8, t);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + decayMod + 0.2); 

        osc.connect(rumbleDelay);
        rumbleDelay.connect(rumbleDisto);
        rumbleDisto.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(masterGain);
    }
};

// 2. SNARE (CORRIGÉE et ÉTENDUE)
window.playSnare = function(isAccent) {
    // On augmente le buffer à 0.5s pour éviter que les snares "longues" ne coupent net
    const buffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.5, window.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = window.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filt = window.audioCtx.createBiquadFilter();
    filt.type = 'highpass';

    // Lecture des paramètres en direct
    let baseTone = window.snareSettings.tone || 1000;
    let lvl = window.snareSettings.level;
    let snap = window.snareSettings.snappy || 1;

    if (isAccent) {
        lvl = Math.min(1.2, lvl * window.globalAccentBoost);
        baseTone += 200;
        snap += 0.2;
    }

    filt.frequency.value = baseTone;

    const g = window.audioCtx.createGain();
    noise.connect(filt);
    filt.connect(g);
    g.connect(masterGain);

    const now = window.audioCtx.currentTime;
    g.gain.setValueAtTime(lvl, now);
    
    // Calcul de la durée exacte
    const decayDuration = 0.2 * snap;
    g.gain.exponentialRampToValueAtTime(0.001, now + decayDuration);

    noise.start(now);
    noise.stop(now + decayDuration + 0.1);
};

// 3. HI-HATS
window.playHiHat = function(isOpen, isAccent) {
    const noise = window.audioCtx.createBufferSource();
    noise.buffer = hhBuffer; 
    
    const filt = window.audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    
    let tone = window.hhSettings.tone || 8000;
    // Sélection explicite de la durée (Ouvert vs Fermé)
    let d = isOpen ? (window.hhSettings.decayOpen || 0.3) : (window.hhSettings.decayClose || 0.05);
    let l = isOpen ? (window.hhSettings.levelOpen || 0.5) : (window.hhSettings.levelClose || 0.4);
    
    if (isAccent) { 
        l = Math.min(1.0, l * window.globalAccentBoost); 
        d += 0.05; 
        tone += 500; 
    }
    
    filt.frequency.value = tone;
    
    const g = window.audioCtx.createGain();
    noise.connect(filt); 
    filt.connect(g); 
    g.connect(masterGain);
    
    const now = window.audioCtx.currentTime;
    g.gain.setValueAtTime(l, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + d);
    g.gain.linearRampToValueAtTime(0, now + d + 0.05); 
    
    noise.start(now);
    noise.stop(now + d + 0.1); 
};

// 4. FM DRUM
window.playDrumFM = function(isAccent, stepIndex) {
    const car = window.audioCtx.createOscillator();
    const mod = window.audioCtx.createOscillator();
    const modG = window.audioCtx.createGain();
    const mainG = window.audioCtx.createGain();

    // Fréquence de base (Pattern)
    let baseFreq = 100;
    if (typeof stepIndex === 'number' && window.fmFreqData && window.fmFreqData[stepIndex]) {
        baseFreq = window.fmFreqData[stepIndex];
    }

    // Réglages Sliders
    const globalKnobVal = window.fmSettings.carrierPitch || 100;
    const transposeRatio = globalKnobVal / 100; 
    const finalCarrierFreq = baseFreq * transposeRatio;
    
    const modKnobVal = window.fmSettings.modPitch || 50;
    const modRatio = (modKnobVal + 1) / 50; 
    const finalModFreq = finalCarrierFreq * modRatio;

    let amt = window.fmSettings.fmAmount || 100;
    let lvl = window.fmSettings.level || 0.5;
    let decay = window.fmSettings.decay || 0.3;

    if (isAccent) { 
        lvl = Math.min(1.0, lvl * window.globalAccentBoost); 
        amt += 50; 
        decay += 0.1; 
    }

    // Scaling de la FM pour garder la musicalité
    const scaling = Math.max(1, finalCarrierFreq / 100); 
    const finalAmount = amt * scaling;

    modG.gain.value = finalAmount;
    car.frequency.value = finalCarrierFreq; 
    mod.frequency.value = finalModFreq;

    mod.connect(modG); 
    modG.connect(car.frequency); 
    car.connect(mainG); 
    mainG.connect(masterGain);
    
    mainG.gain.setValueAtTime(lvl, window.audioCtx.currentTime);
    mainG.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + decay);
    
    car.start(); mod.start(); 
    car.stop(window.audioCtx.currentTime + decay); 
    mod.stop(window.audioCtx.currentTime + decay);
};

// 5. SYNTH NOTE GENERATOR
function playSynthNote(freq, volume, seqId, isAccent) {
    if (!freq || freq < 20) return;
    
    let targetVol = (typeof volume === 'number') ? volume : 0.5;
    
    if (isAccent) {
        targetVol = Math.min(1.0, targetVol * window.globalAccentBoost);
    }

    const params = (seqId === 3) ? window.paramsSeq3 : window.paramsSeq2;
    const targetNode = (seqId === 3) ? distoNode3 : distoNode2;

    const osc = window.audioCtx.createOscillator();
    const vca = window.audioCtx.createGain();
    const filter = window.audioCtx.createBiquadFilter();
    
    osc.type = (seqId === 3) ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, window.audioCtx.currentTime);
    
    filter.type = 'lowpass';
    filter.Q.value = params.res;
    
    let baseCutoff = freq * params.cutoff;
    if (isAccent) baseCutoff *= 1.5; 
    
    filter.frequency.setValueAtTime(baseCutoff, window.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq, window.audioCtx.currentTime + 0.1);

    osc.connect(filter); filter.connect(vca); vca.connect(targetNode);
    
    vca.gain.setValueAtTime(0, window.audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(targetVol, window.audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + params.decay);
    
    osc.start(); osc.stop(window.audioCtx.currentTime + params.decay + 0.1);
}

// 6. SYNTH SEQUENCER TRIGGER (CHORD MODE)
window.playSynthStep = function(stepIndex, freqValue, seqId, isActive, isAccent) {
    if (seqId === 2 && window.isMutedSeq2) return;
    if (seqId === 3 && window.isMutedSeq3) return;
    
    if (isActive) {
        if (seqId === 2) {
            playSynthNote(freqValue, window.synthVol2, 2, isAccent);
        } 
        else if (seqId === 3) {
            if (window.isChordModeSeq3 === true) {
                // --- MODE ACCORD ---
                let isMajor = false;
                if (window.chordQualitySeq3 && window.chordQualitySeq3[stepIndex]) {
                    isMajor = window.chordQualitySeq3[stepIndex];
                }

                const thirdRatio = isMajor ? 1.2599 : 1.1892;
                const vol = window.synthVol3 * 0.4; 

                playSynthNote(freqValue, vol, 3, isAccent);             
                playSynthNote(freqValue * thirdRatio, vol, 3, isAccent); 
                playSynthNote(freqValue * 1.4983, vol, 3, isAccent);    

            } else {
                // --- MODE MONO ---
                playSynthNote(freqValue, window.synthVol3, 3, isAccent);
            }
        }
    }
};

// PONT PREVIEW
window.playSynthSound = function(seqId, freq, duration, slide, disto) {
    const vol = (seqId === 3) ? window.synthVol3 : window.synthVol2;
    playSynthNote(freq, vol, seqId, false); 
};

// --- VISUALIZER ---
setTimeout(() => {
    if (window.initOscilloscope && window.audioCtx && window.masterGain) {
        window.initOscilloscope(window.audioCtx, window.masterGain, "oscilloscope");
    }
}, 500);

console.log("AUDIO V11 : Engine Ready & Secured.");
