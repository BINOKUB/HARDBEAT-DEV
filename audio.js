/* ==========================================
   HARDBEAT PRO - AUDIO ENGINE (V9 - CHORD MODE SEQ 3)
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

// --- FONCTION HI-HAT ---
const hhBuffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.5, window.audioCtx.sampleRate);
const hhData = hhBuffer.getChannelData(0);
for (let i = 0; i < hhData.length; i++) hhData[i] = Math.random() * 2 - 1;

// --- ETAT GLOBAL ---
window.isPlaying = false;
window.globalAccentBoost = 1.4; 

window.kickSettings = { pitch: 150, decay: 0.5, level: 0.8, rumble: 0 };
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

window.playKick = function(isAccent) {
    const t = window.audioCtx.currentTime;
    
    // --- 1. LE KICK PRINCIPAL (CLEAN) ---
    const osc = window.audioCtx.createOscillator();
    const g = window.audioCtx.createGain();
    
    osc.connect(g);
    g.connect(masterGain); // Sortie directe

    let lvl = window.kickSettings.level;
    let decayMod = window.kickSettings.decay;

    if (isAccent) {
        lvl = Math.min(1.2, lvl * window.globalAccentBoost);
        decayMod += 0.1;
    }

    // Enveloppe de Pitch (Le "Pouw")
    osc.frequency.setValueAtTime(window.kickSettings.pitch || 150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + decayMod);

    // Enveloppe de Volume
    g.gain.setValueAtTime(lvl, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decayMod);

    osc.start(t);
    osc.stop(t + decayMod + 0.5); // On laisse un peu de marge pour le stop

    // --- 2. LE RUMBLE ENGINE (L'Effet Techno) ---
    // On ne le déclenche que si le potard est monté
    if (window.kickSettings.rumble && window.kickSettings.rumble > 0.05) {
        
        // Création de la chaîne Rumble
        const rumbleGain = window.audioCtx.createGain();
        const rumbleFilter = window.audioCtx.createBiquadFilter();
        const rumbleDelay = window.audioCtx.createDelay();
        const rumbleDisto = window.audioCtx.createWaveShaper();

        // Réglages Rumble
        // 1. DELAY : On décale le grondement de 30ms pour laisser passer l'attaque du kick (le "Clack")
        rumbleDelay.delayTime.value = 0.03; 

        // 2. DISTO : On salit le son pour qu'il prenne de la place
        function makeDistortionCurve(amount) {
            let k = amount, n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180, i = 0, x;
            for ( ; i < n_samples; ++i ) {
                x = i * 2 / n_samples - 1;
                curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
            }
            return curve;
        }
        rumbleDisto.curve = makeDistortionCurve(50); // Disto modérée
        rumbleDisto.oversample = '2x';

        // 3. FILTER : On ne garde que les graves (le grondement)
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 120; // Coupe tout au-dessus de 120Hz

        // 4. GAIN : Contrôlé par le potard violet
        // On booste un peu la valeur car le filtre mange du volume
        rumbleGain.gain.setValueAtTime(window.kickSettings.rumble * 0.8, t);
        // Le rumble dure un peu plus longtemps que le kick
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + decayMod + 0.2); 

        // CONNEXIONS : Osc -> Delay -> Disto -> Filter -> Gain -> Master
        // On dérive le signal de l'oscillateur du kick
        osc.connect(rumbleDelay);
        rumbleDelay.connect(rumbleDisto);
        rumbleDisto.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(masterGain);
    }
};


window.playSnare = function(isAccent) { const buffer = window.audioCtx.createBuffer(1, window.audioCtx.sampleRate * 0.2, window.audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; const noise = window.audioCtx.createBufferSource(); noise.buffer = buffer; const filt = window.audioCtx.createBiquadFilter(); filt.type = 'highpass'; let baseTone = window.snareSettings.tone || 1000; let lvl = window.snareSettings.level; let snap = window.snareSettings.snappy || 1; if (isAccent) { lvl = Math.min(1.2, lvl * window.globalAccentBoost); baseTone += 200; snap += 0.2; } filt.frequency.value = baseTone; const g = window.audioCtx.createGain(); noise.connect(filt); filt.connect(g); g.connect(masterGain); g.gain.setValueAtTime(lvl, window.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + (0.2 * snap)); noise.start(); }

window.playHiHat = function(isOpen, isAccent) {
    const noise = window.audioCtx.createBufferSource();
    noise.buffer = hhBuffer; 
    const filt = window.audioCtx.createBiquadFilter();
    filt.type = 'highpass';
    let tone = window.hhSettings.tone || 8000;
    let d = isOpen ? (window.hhSettings.decayOpen || 0.3) : (window.hhSettings.decayClose || 0.05);
    let l = isOpen ? (window.hhSettings.levelOpen || 0.5) : (window.hhSettings.levelClose || 0.4);
    if (isAccent) { l = Math.min(1.0, l * window.globalAccentBoost); d += 0.05; tone += 500; }
    filt.frequency.value = tone;
    const g = window.audioCtx.createGain();
    noise.connect(filt); filt.connect(g); g.connect(masterGain);
    const now = window.audioCtx.currentTime;
    g.gain.setValueAtTime(l, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + d);
    g.gain.linearRampToValueAtTime(0, now + d + 0.05); 
    noise.start();
    noise.stop(now + d + 0.1); 
};

// --- FM MELODIQUE ---
window.playDrumFM = function(isAccent, stepIndex) {
    const car = window.audioCtx.createOscillator();
    const mod = window.audioCtx.createOscillator();
    const modG = window.audioCtx.createGain();
    const mainG = window.audioCtx.createGain();

    let baseFreq = 100;
    if (typeof stepIndex === 'number' && window.fmFreqData && window.fmFreqData[stepIndex]) {
        baseFreq = window.fmFreqData[stepIndex];
    }

    const globalKnobVal = window.fmSettings.carrierPitch || 100;
    const transposeRatio = globalKnobVal / 100; 
    const finalCarrierFreq = baseFreq * transposeRatio;
    const modKnobVal = window.fmSettings.modPitch || 50;
    const modRatio = (modKnobVal + 1) / 50; 
    const finalModFreq = finalCarrierFreq * modRatio;

    let amt = window.fmSettings.fmAmount || 100;
    let lvl = window.fmSettings.level || 0.5;
    let decay = window.fmSettings.decay || 0.3;

    if (isAccent) { lvl = Math.min(1.0, lvl * window.globalAccentBoost); amt += 50; decay += 0.1; }

    const scaling = Math.max(1, finalCarrierFreq / 100); 
    const finalAmount = amt * scaling;

    modG.gain.value = finalAmount;
    car.frequency.value = finalCarrierFreq; 
    mod.frequency.value = finalModFreq;

    mod.connect(modG); modG.connect(car.frequency); car.connect(mainG); mainG.connect(masterGain);
    mainG.gain.setValueAtTime(lvl, window.audioCtx.currentTime);
    mainG.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + decay);
    car.start(); mod.start(); car.stop(window.audioCtx.currentTime + decay); mod.stop(window.audioCtx.currentTime + decay);
};

// --- SYNTH NOTE GENERATOR ---
function playSynthNote(freq, volume, seqId, isAccent) {
    if (!freq || freq < 20) return;
    
    let targetVol = (typeof volume === 'number') ? volume : 0.5;
    let cutoffMult = 1.0;
    
    if (isAccent) {
        targetVol = Math.min(1.0, targetVol * window.globalAccentBoost);
        cutoffMult = 1.5; 
    }

    const params = (seqId === 3) ? window.paramsSeq3 : window.paramsSeq2;
    const targetNode = (seqId === 3) ? distoNode3 : distoNode2;

    const osc = window.audioCtx.createOscillator();
    const vca = window.audioCtx.createGain();
    const filter = window.audioCtx.createBiquadFilter();
    
    // Type d'onde : Saw pour Seq2, Square pour Seq3 (mieux pour accords)
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

// --- PONT TRIGGER (MODIFIÉ POUR ACCORDS SUR SEQ 3) ---
/* ==========================================
   MODIF : CHORD MODE (ON/OFF)
   ========================================== */
window.playSynthStep = function(stepIndex, freqValue, seqId, isActive, isAccent) {
    if (seqId === 2 && window.isMutedSeq2) return;
    if (seqId === 3 && window.isMutedSeq3) return;
    
    if (isActive) {
        if (seqId === 2) {
            // SEQ 2 : TOUJOURS MONO
            playSynthNote(freqValue, window.synthVol2, 2, isAccent);
        } 
        else if (seqId === 3) {
            // SEQ 3 : VÉRIFICATION DU BOUTON CHORD
            if (window.isChordModeSeq3 === true) {
                // --- MODE ACCORD (ON) ---
                const vol = window.synthVol3 * 0.4; // On baisse un peu le volume cumulé
                playSynthNote(freqValue, vol, 3, isAccent);            // Note 1
                playSynthNote(freqValue * 1.1892, vol, 3, isAccent);   // Note 2
                playSynthNote(freqValue * 1.4983, vol, 3, isAccent);   // Note 3
            } else {
                // --- MODE MONO (OFF) - CLASSIQUE ---
                playSynthNote(freqValue, window.synthVol3, 3, isAccent);
            }
        }
    }
};

// PONT PREVIEW
window.playSynthSound = function(seqId, freq, duration, slide, disto) {
    const vol = (seqId === 3) ? window.synthVol3 : window.synthVol2;
    // Pour la preview au clic, on joue juste la fondamentale pour pas que ce soit le bazar
    playSynthNote(freq, vol, seqId, false); 
};

console.log("AUDIO V9: Chord Mode Activé sur SEQ 3 !");

// --- VISUALIZER ---
setTimeout(() => {
    if (window.initOscilloscope && window.audioCtx && window.masterGain) {
        window.initOscilloscope(window.audioCtx, window.masterGain, "oscilloscope");
    }
}, 500);
