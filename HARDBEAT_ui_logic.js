/* ==========================================
   HARDBEAT PRO - UI LOGIC (FINAL FIX)
   ========================================== */
let timerSeq1;
let currentTrackIndex = 0;

function initGrid() {
    // PADS DRUMS
    const drumGrid = document.getElementById('grid-seq1');
    if (drumGrid) {
        drumGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            drumGrid.innerHTML += `<div class="step-pad" data-index="${i}"><span>${i+1}</span><div class="led"></div></div>`;
        }
    }
    // PADS SYNTH
    const synthGrid = document.getElementById('grid-seq2');
    if (synthGrid) {
        synthGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            synthGrid.innerHTML += `<div class="step-pad" data-index="${i}"><div class="led"></div></div>`;
        }
    }
    // FADERS SYNTH
    const freqGrid = document.getElementById('grid-freq-seq2');
    if (freqGrid) {
        freqGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            freqGrid.innerHTML += `
                <div class="fader-unit">
                    <span class="hz-label">440Hz</span>
                    <input type="range" class="freq-fader" min="50" max="880" value="440" oninput="this.previousElementSibling.innerText=this.value+'Hz'">
                </div>`;
        }
    }
}

function bindControls() {
    const bind = (id, obj, prop) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value);
    };

    // --- DRUMS ---
    // Kick
    bind('kick-pitch', kickSettings, 'pitch');
    bind('kick-decay', kickSettings, 'decay');
    bind('kick-level', kickSettings, 'level');
    // Snare
    bind('snare-tone', snareSettings, 'tone');
    bind('snare-snappy', snareSettings, 'snappy');
    bind('snare-level', snareSettings, 'level');
    // HH
    bind('hhc-tone', hhSettings, 'tone');
    bind('hhc-level', hhSettings, 'levelClose');
    bind('hho-decay', hhSettings, 'decayOpen');
    bind('hho-level', hhSettings, 'levelOpen');
    // FM Drum
    bind('fm-carrier', fmSettings, 'carrierPitch');
    bind('fm-mod', fmSettings, 'modPitch');
    bind('fm-amt', fmSettings, 'fmAmount');
    bind('fm-decay', fmSettings, 'decay');
    bind('fm-level', fmSettings, 'level');

    // --- SYNTH MASTER ---
    // Disto : Appel spécial pour recalculer la courbe
    const distoSlider = document.getElementById('synth-disto');
    if (distoSlider) {
        distoSlider.oninput = (e) => {
            if (window.updateDistortion) window.updateDistortion(parseFloat(e.target.value));
        };
    }
    
    bind('synth-res', synthParams, 'resonance');
    bind('synth-cutoff', synthParams, 'cutoffEnv');
    
    // Delay (Gain et Time)
    const dAmt = document.getElementById('synth-delay-amt');
    if (dAmt) dAmt.oninput = (e) => {
        synthParams.delayAmt = parseFloat(e.target.value);
        if(delayMix) delayMix.gain.value = synthParams.delayAmt;
        if(feedback) feedback.gain.value = synthParams.delayAmt * 0.7;
    };
    
    const dTime = document.getElementById('synth-delay-time');
    if (dTime) dTime.oninput = (e) => {
        synthParams.delayTime = parseFloat(e.target.value);
        if(delayNode) delayNode.delayTime.value = synthParams.delayTime;
    };

    // Master Vol
    const vol = document.getElementById('master-gain');
    if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);
}

function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

function refreshGridVisuals() {
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach((pad, i) => {
        const isActive = drumSequences[currentTrackIndex][i];
        pad.classList.toggle('active', isActive);
        const led = pad.querySelector('.led');
        if (led) led.style.background = isActive ? "red" : "#330000";
    });
}

function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // TRIGGERS AUDIO COMPLETS
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false); // Close
    if (drumSequences[3][currentStep]) playHiHat(true);  // Open
    if (drumSequences[4][currentStep]) playDrumFM();     // FM

    checkSynthTick(currentStep);

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

function initRandomizer() {
    const btn = document.querySelector('.btn-random');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        btn.style.background = "#00f3ff"; btn.style.color = "#000";
        setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100);
        faders.forEach(fader => {
            const randomFreq = Math.floor(Math.random() * (880 - 50) + 50);
            fader.value = randomFreq;
            if (fader.previousElementSibling) fader.previousElementSibling.innerText = randomFreq + "Hz";
        });
    });
}

window.addEventListener('load', () => {
    initGrid();
    bindControls();
    showParamsForTrack(0);
    initRandomizer();
    console.log("UI Logic : Prêt (V3).");
});

document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const parentId = pad.parentElement.id;
        
        if (parentId === 'grid-seq1') {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            refreshGridVisuals();
        } else if (parentId === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
    }

    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        showParamsForTrack(currentTrackIndex);
        refreshGridVisuals();
    }
});

const playBtn = document.getElementById('master-play-stop');
if (playBtn) {
    playBtn.onclick = () => {
        if (isPlaying) {
            isPlaying = false; clearTimeout(timerSeq1);
            playBtn.innerText = "PLAY / STOP";
            playBtn.style.background = "#222"; playBtn.style.color = "#fff";
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; 
            playBtn.innerText = "STOP";
            playBtn.style.background = "#00f3ff"; playBtn.style.color = "#000";
            runTick();
        }
    };
}
