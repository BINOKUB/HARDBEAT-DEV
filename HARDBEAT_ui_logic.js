/* ==========================================
   HARDBEAT PRO - UI LOGIC (INDEPENDENT LOOPS)
   ========================================== */
let timerDrums;
let timerSynths;

function initGrid(idPrefix) {
    const drumGrid = document.getElementById(idPrefix);
    if (!drumGrid) return;
    drumGrid.innerHTML = '';
    const isDrum = (idPrefix === 'grid-seq1');
    for (let i = 0; i < 16; i++) {
        let content = `<div class="led"></div>`;
        if (isDrum) content = `<span>${i+1}</span>` + content;
        drumGrid.innerHTML += `<div class="step-pad" data-index="${i}">${content}</div>`;
    }
}

function initFaders(idPrefix) {
    const freqGrid = document.getElementById(idPrefix);
    if (!freqGrid) return;
    freqGrid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        freqGrid.innerHTML += `
            <div class="fader-unit">
                <span class="hz-label">440Hz</span>
                <input type="range" class="freq-fader" min="50" max="880" value="440" oninput="this.previousElementSibling.innerText=this.value+'Hz'">
            </div>`;
    }
}

function bindControls() {
    const bind = (id, obj, prop) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value);
    };

    // DRUMS
    bind('kick-pitch', kickSettings, 'pitch');
    bind('kick-decay', kickSettings, 'decay');
    bind('kick-level', kickSettings, 'level');
    bind('snare-tone', snareSettings, 'tone');
    bind('snare-snappy', snareSettings, 'snappy');
    bind('snare-level', snareSettings, 'level');
    bind('hhc-tone', hhSettings, 'tone');
    bind('hhc-level', hhSettings, 'levelClose');
    bind('hho-decay', hhSettings, 'decayOpen');
    bind('hho-level', hhSettings, 'levelOpen');
    bind('fm-carrier', fmSettings, 'carrierPitch');
    bind('fm-mod', fmSettings, 'modPitch');
    bind('fm-amt', fmSettings, 'fmAmount');
    bind('fm-decay', fmSettings, 'decay');
    bind('fm-level', fmSettings, 'level');

    // SYNTH VOLUMES (Variable globale directe)
    const v2 = document.getElementById('vol-seq2');
    if(v2) v2.oninput = (e) => synthVol2 = parseFloat(e.target.value);
    
    // SYNTH MASTER
    const disto = document.getElementById('synth-disto');
    if (disto) disto.oninput = (e) => { if(window.updateDistortion) window.updateDistortion(parseFloat(e.target.value)); };
    
    bind('synth-res', synthParams, 'resonance');
    bind('synth-cutoff', synthParams, 'cutoffEnv');
    const dAmt = document.getElementById('synth-delay-amt');
    if(dAmt) dAmt.oninput = (e) => {
        synthParams.delayAmt = parseFloat(e.target.value);
        if(typeof delayMix!=='undefined') delayMix.gain.value = synthParams.delayAmt;
        if(typeof feedback!=='undefined') feedback.gain.value = synthParams.delayAmt * 0.7;
    };
    const dTime = document.getElementById('synth-delay-time');
    if(dTime) dTime.oninput = (e) => {
        synthParams.delayTime = parseFloat(e.target.value);
        if(typeof delayNode!=='undefined') delayNode.delayTime.value = synthParams.delayTime;
    };
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

function setupTempoDrag(id) {
    const el = document.getElementById(id);
    if(!el) return;
    let isDragging = false, startY = 0, startVal = 0;
    el.style.cursor = "ns-resize";
    el.addEventListener('mousedown', (e) => {
        isDragging = true; startY = e.clientY; startVal = parseInt(el.innerText);
        document.body.style.cursor = "ns-resize"; e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newVal = startVal + Math.floor((startY - e.clientY) / 2);
        if (newVal < 40) newVal = 40; if (newVal > 300) newVal = 300;
        el.innerText = newVal;
    });
    window.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = "default"; });
}

function initSeq3Extension() {
    const btn = document.getElementById('add-seq-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        btn.disabled = true; btn.style.opacity = "0.3"; btn.innerText = "SEQ 3 ACTIVE";
        const zone = document.getElementById('extension-zone');
        // On injecte aussi le Volume pour SEQ 3
        zone.innerHTML = `
        <section id="seq3-container" class="rack-section synth-instance">
            <div class="section-header">
                <h2 style="color:#a855f7">SEQ 3 : HARDGROOVE LAYER</h2>
                <div style="display:flex; gap:20px; align-items:center;">
                    <div class="bpm-control">
                        <label>VOL</label>
                        <input type="range" id="vol-seq3" min="0" max="1" step="0.01" value="0.6" style="width:60px">
                    </div>
                    <div class="bpm-control">
                        <label>SYNC</label>
                        <span style="color:#666; font-size:10px;">LOCKED TO TEMPO 2</span>
                    </div>
                </div>
            </div>
            <div class="freq-sliders-container" id="grid-freq-seq3"></div>
            <div class="step-grid" id="grid-seq3"></div>
        </section>`;
        
        initGrid('grid-seq3');
        initFaders('grid-freq-seq3');
        
        // Binding immédiat du volume 3
        const v3 = document.getElementById('vol-seq3');
        if(v3) v3.oninput = (e) => synthVol3 = parseFloat(e.target.value);
        
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// --- BOUCLE 1 : DRUMS ---
function runDrumLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Visuel Tête de lecture Drums
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach(p => p.style.borderColor = "#333");
    if (pads[currentDrumStep]) pads[currentDrumStep].style.borderColor = "#ffffff";

    // Audio
    if (drumSequences[0][currentDrumStep]) playKick();
    if (drumSequences[1][currentDrumStep]) playSnare();
    if (drumSequences[2][currentDrumStep]) playHiHat(false);
    if (drumSequences[3][currentDrumStep]) playHiHat(true);
    if (drumSequences[4][currentDrumStep]) playDrumFM();

    currentDrumStep = (currentDrumStep + 1) % 16;
    timerDrums = setTimeout(runDrumLoop, stepDuration);
}

// --- BOUCLE 2 : SYNTHS (SEQ 2 + SEQ 3) ---
function runSynthLoop() {
    if (!isPlaying) return;
    // On lit le TEMPO 2 !
    const bpm = parseInt(document.getElementById('display-bpm2').innerText) || 122;
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Visuel Tête de lecture Synth (Seq 2)
    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    pads2.forEach(p => p.style.borderColor = "#333");
    if (pads2[currentSynthStep]) pads2[currentSynthStep].style.borderColor = "#00f3ff"; // Cyan

    // Visuel Tête de lecture Synth (Seq 3)
    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    if (pads3.length > 0) {
        pads3.forEach(p => p.style.borderColor = "#333");
        if (pads3[currentSynthStep]) pads3[currentSynthStep].style.borderColor = "#a855f7"; // Violet
    }

    // Audio Trigger (Gère Seq 2 et 3)
    checkSynthTick(currentSynthStep);

    currentSynthStep = (currentSynthStep + 1) % 16;
    timerSynths = setTimeout(runSynthLoop, stepDuration);
}

// --- STARTUP ---
window.addEventListener('load', () => {
    initGrid('grid-seq1');
    initGrid('grid-seq2');
    initFaders('grid-freq-seq2');
    bindControls();
    showParamsForTrack(0);
    
    // Config Tempos Indépendants
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    initSeq3Extension();

    // Randomize
    const btnRand = document.querySelector('.btn-random');
    if(btnRand) btnRand.onclick = () => {
        document.querySelectorAll('#grid-freq-seq2 .freq-fader').forEach(f => {
            f.value = Math.floor(Math.random()*(880-50)+50);
            if(f.previousElementSibling) f.previousElementSibling.innerText = f.value+"Hz";
        });
    };
});

document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const pid = pad.parentElement.id;
        
        if (pid === 'grid-seq1') {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            refreshGridVisuals();
        } else if (pid === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        } else if (pid === 'grid-seq3') {
            synthSequences.seq3[idx] = !synthSequences.seq3[idx];
            pad.classList.toggle('active', synthSequences.seq3[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq3[idx] ? "#a855f7" : "#330000";
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
            isPlaying = false; 
            clearTimeout(timerDrums);
            clearTimeout(timerSynths);
            playBtn.innerText = "PLAY / STOP";
            playBtn.style.background = "#222"; playBtn.style.color = "#fff";
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; 
            playBtn.innerText = "STOP";
            playBtn.style.background = "#00f3ff"; playBtn.style.color = "#000";
            
            // Lance les DEUX moteurs
            runDrumLoop();
            runSynthLoop();
        }
    };
}
