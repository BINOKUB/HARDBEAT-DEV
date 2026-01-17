/* ==========================================
   HARDBEAT PRO - UI LOGIC (FULL)
   ========================================== */
let timerDrums;
let timerSynths;
let isMetroOn = false;

function initGrid(idPrefix) {
    const gridContainer = document.getElementById(idPrefix);
    if (!gridContainer) return;
    
    let htmlContent = '';
    const isDrum = (idPrefix === 'grid-seq1');
    
    for (let i = 0; i < 16; i++) {
        let padHTML = '';
        if (isDrum) {
            padHTML = `
            <div class="step-column">
                <div class="step-pad" data-index="${i}" data-type="note">
                    <span>${i+1}</span>
                    <div class="led"></div>
                </div>
                <div class="accent-pad" data-index="${i}" data-type="accent" title="Accent"></div>
            </div>`;
        } else {
            padHTML = `
            <div class="step-pad" data-index="${i}" data-type="note">
                <div class="led"></div>
            </div>`;
        }
        htmlContent += padHTML;
    }
    gridContainer.innerHTML = htmlContent;
}

function initFaders(idPrefix, seqId) {
    const freqGrid = document.getElementById(idPrefix);
    if (!freqGrid) return;
    let htmlContent = '';
    for (let i = 0; i < 16; i++) {
        htmlContent += `
            <div class="fader-unit">
                <span class="hz-label">440Hz</span>
                <input type="range" class="freq-fader" data-seq="${seqId}" data-index="${i}" min="50" max="880" value="440">
            </div>`;
    }
    freqGrid.innerHTML = htmlContent;
}

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('freq-fader')) {
        const val = parseFloat(e.target.value);
        const idx = parseInt(e.target.dataset.index);
        const seq = parseInt(e.target.dataset.seq);
        if (e.target.previousElementSibling) e.target.previousElementSibling.innerText = val + "Hz";
        if (window.updateFreqCache) window.updateFreqCache(seq, idx, val);
    }
});

function bindControls() {
    const bind = (id, obj, prop) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value);
    };

    // Drums
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

    // NOUVEAU : GLOBAL ACCENT
    const accSlider = document.getElementById('global-accent-amount');
    if(accSlider) accSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        if(window.updateAccentBoost) window.updateAccentBoost(val);
        const label = document.getElementById('accent-val-display');
        if(label) label.innerText = val.toFixed(1) + 'x';
    };

    const metroBox = document.getElementById('metro-toggle');
    if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;

    const v2 = document.getElementById('vol-seq2');
    if(v2) v2.oninput = (e) => synthVol2 = parseFloat(e.target.value);
    
    const disto = document.getElementById('synth-disto');
    if (disto) disto.oninput = (e) => { 
        if(window.updateDistortion) window.updateDistortion(parseFloat(e.target.value)); 
    };
    const dAmt = document.getElementById('synth-delay-amt');
    if(dAmt) dAmt.oninput = (e) => {
        if(window.updateDelayAmount) window.updateDelayAmount(parseFloat(e.target.value));
    };
    const dTime = document.getElementById('synth-delay-time');
    if(dTime) dTime.oninput = (e) => {
        if(window.updateDelayTime) window.updateDelayTime(parseFloat(e.target.value));
    };
    bind('synth-res', synthParams, 'resonance');
    bind('synth-cutoff', synthParams, 'cutoffEnv');
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
    const accents = document.querySelectorAll('#grid-seq1 .accent-pad');
    
    if(pads.length === 0) return;

    // Notes
    pads.forEach((pad, i) => {
        if(drumSequences && drumSequences[currentTrackIndex]) {
            const isActive = drumSequences[currentTrackIndex][i];
            pad.classList.toggle('active', isActive);
            const led = pad.querySelector('.led');
            if (led) led.style.background = isActive ? "red" : "#330000";
        }
    });

    // Accents
    accents.forEach((acc, i) => {
        if(drumAccents && drumAccents[currentTrackIndex]) {
            const isActive = drumAccents[currentTrackIndex][i];
            acc.classList.toggle('active', isActive);
        }
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
        initFaders('grid-freq-seq3', 3);
        const v3 = document.getElementById('vol-seq3');
        if(v3) v3.oninput = (e) => synthVol3 = parseFloat(e.target.value);
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// --- BOUCLES ---
let currentDrumStep = 0;
let currentSynthStep = 0;

function runDrumLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    if (isMetroOn && currentDrumStep % 4 === 0) {
        if(window.playMetronome) playMetronome(currentDrumStep === 0);
    }

    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach(p => p.style.borderColor = "#333");
    if (pads[currentDrumStep]) pads[currentDrumStep].style.borderColor = "#ffffff";

    // AUDIO AVEC ACCENT
    const acc = drumAccents;
    if (drumSequences[0][currentDrumStep]) playKick(acc[0][currentDrumStep]);
    if (drumSequences[1][currentDrumStep]) playSnare(acc[1][currentDrumStep]);
    if (drumSequences[2][currentDrumStep]) playHiHat(false, acc[2][currentDrumStep]);
    if (drumSequences[3][currentDrumStep]) playHiHat(true, acc[3][currentDrumStep]);
    if (drumSequences[4][currentDrumStep]) playDrumFM(acc[4][currentDrumStep]);

    currentDrumStep = (currentDrumStep + 1) % 16;
    timerDrums = setTimeout(runDrumLoop, stepDuration);
}

function runSynthLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm2').innerText) || 122;
    const stepDuration = (60 / bpm) / 4 * 1000;

    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    pads2.forEach(p => p.style.borderColor = "#333");
    if (pads2[currentSynthStep]) pads2[currentSynthStep].style.borderColor = "#00f3ff";

    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    if (pads3.length > 0) {
        pads3.forEach(p => p.style.borderColor = "#333");
        if (pads3[currentSynthStep]) pads3[currentSynthStep].style.borderColor = "#a855f7";
    }

    if(window.checkSynthTick) checkSynthTick(currentSynthStep);
    currentSynthStep = (currentSynthStep + 1) % 16;
    timerSynths = setTimeout(runSynthLoop, stepDuration);
}

// --- ÉCOUTEURS ---
document.addEventListener('mousedown', (e) => {
    // PAD
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const pid = pad.closest('.step-grid').id;
        
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

    // ACCENT
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        const idx = parseInt(accentBtn.dataset.index);
        drumAccents[currentTrackIndex][idx] = !drumAccents[currentTrackIndex][idx];
        refreshGridVisuals();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        showParamsForTrack(currentTrackIndex);
        refreshGridVisuals();

        // Audition
        switch(currentTrackIndex) {
            case 0: if(window.playKick) playKick(); break;
            case 1: if(window.playSnare) playSnare(); break;
            case 2: if(window.playHiHat) playHiHat(false); break;
            case 3: if(window.playHiHat) playHiHat(true); break;
            case 4: if(window.playDrumFM) playDrumFM(); break;
        }
    }
});

window.addEventListener('load', () => {
    initGrid('grid-seq1');
    initGrid('grid-seq2');
    initFaders('grid-freq-seq2', 2);
    bindControls();
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    initSeq3Extension();
    
    currentTrackIndex = 0;
    showParamsForTrack(0);
    setTimeout(() => refreshGridVisuals(), 50);
    
    const btnRand = document.querySelector('.btn-random');
    if(btnRand) btnRand.onclick = () => {
        document.querySelectorAll('#grid-freq-seq2 .freq-fader').forEach(f => {
            f.value = Math.floor(Math.random()*(880-50)+50);
            f.dispatchEvent(new Event('input', { bubbles: true }));
        });
    };
    
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
                runDrumLoop();
                runSynthLoop();
            }
        };
    }
    console.log("UI Logic : Prêt (Full Features).");
});
