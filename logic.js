/* ==========================================
   HARDBEAT PRO - UI LOGIC (MODULAR V5)
   ========================================== */

let timerDrums; let timerSynths;
let isMetroOn = false; 
let globalSwing = 0.06;

// --- EXPOSITION DES VARIABLES GLOBALES (Pour storage.js) ---
window.masterLength = 16;      
window.isSaveMode = false;

// Mémoire des séquences (Attachée à window pour accès global)
window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
window.synthSequences = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };
window.freqDataSeq2 = Array(64).fill(440);
window.freqDataSeq3 = Array(64).fill(440);

window.trackLengths = [16, 16, 16, 16, 16]; 
window.trackMutes = [false, false, false, false, false];
window.trackSolos = [false, false, false, false, false];

// Variables internes de navigation (pas besoin d'être globales)
let currentPageSeq1 = 0;    
let currentPageSeq2 = 0;    
let currentPageSeq3 = 0; 
let trackPositions = [0, 0, 0, 0, 0];
let currentTrackIndex = 0;

// --- INIT ---
window.addEventListener('load', () => {
    initGrid('grid-seq1'); 
    initGrid('grid-seq2'); 
    initFaders('grid-freq-seq2', 2);
    
    bindControls(); 
    setupTempoDrag('display-bpm1'); 
    setupTempoDrag('display-bpm2'); 
    initSeq3Extension();
    setupLengthControls();
    setupPageNavigation();

    currentTrackIndex = 0; 
    showParamsForTrack(0); 
    
    // Initialisation du Module de Stockage (si présent)
    if(typeof initStorageSystem === 'function') {
        initStorageSystem();
    } else {
        console.warn("Storage.js non chargé !");
    }
    
    refreshGridVisuals();
    refreshFadersVisuals(2);

    const playBtn = document.getElementById('master-play-stop');
    if (playBtn) playBtn.onclick = () => togglePlay(playBtn);
    
    console.log("UI Logic V5: Ready.");
});

function togglePlay(btn) {
    if (window.isPlaying) {
        window.isPlaying = false; 
        clearTimeout(timerDrums);
        clearTimeout(timerSynths);
        btn.innerText = "PLAY / STOP";
        btn.style.background = "#222"; 
        btn.style.color = "#fff";
        trackPositions = [0,0,0,0,0];
        globalTickCount = 0;
        synthTickCount = 0;
        currentSynthStep = 0;
        refreshGridVisuals();
    } else {
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        window.isPlaying = true; 
        btn.innerText = "STOP";
        btn.style.background = "#00f3ff"; 
        btn.style.color = "#000";
        trackPositions = [0,0,0,0,0]; 
        currentSynthStep = 0;
        globalTickCount = 0;
        synthTickCount = 0;
        runDrumLoop();
        runSynthLoop();
    }
}

// --- GESTION 64 PAS ---
function setupLengthControls() {
    const btns = document.querySelectorAll('.btn-length');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.masterLength = parseInt(btn.dataset.length);
            // On met à jour l'indicateur UI global pour storage.js aussi
            if(window.updateNavButtonsState) window.updateNavButtonsState();
            
            // Sécurité pagination
            if (currentPageSeq1 * 16 >= window.masterLength) { currentPageSeq1 = 0; updatePageIndicator('seq1'); }
            if (currentPageSeq2 * 16 >= window.masterLength) { currentPageSeq2 = 0; updatePageIndicator('seq2'); }
            if (currentPageSeq3 * 16 >= window.masterLength) { currentPageSeq3 = 0; updatePageIndicator('seq3'); }
            
            updateNavButtonsState();
            refreshGridVisuals();
            refreshFadersVisuals(2);
            if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
        });
    });
}

function setupPageNavigation() {
    document.getElementById('btn-prev-page-seq1').onclick = () => { if(currentPageSeq1 > 0) { currentPageSeq1--; updatePageIndicator('seq1'); refreshGridVisuals(); }};
    document.getElementById('btn-next-page-seq1').onclick = () => { if((currentPageSeq1 + 1) * 16 < window.masterLength) { currentPageSeq1++; updatePageIndicator('seq1'); refreshGridVisuals(); }};
    document.getElementById('btn-prev-page-seq2').onclick = () => { if(currentPageSeq2 > 0) { currentPageSeq2--; updatePageIndicator('seq2'); refreshGridVisuals(); refreshFadersVisuals(2); }};
    document.getElementById('btn-next-page-seq2').onclick = () => { if((currentPageSeq2 + 1) * 16 < window.masterLength) { currentPageSeq2++; updatePageIndicator('seq2'); refreshGridVisuals(); refreshFadersVisuals(2); }};
}

function updatePageIndicator(seqId) {
    const indicator = document.getElementById(`page-indicator-${seqId}`);
    let page = (seqId === 'seq1') ? currentPageSeq1 : (seqId === 'seq2') ? currentPageSeq2 : currentPageSeq3;
    const start = (page * 16) + 1;
    const end = (page + 1) * 16;
    indicator.innerText = `${start}-${end}`;
    updateNavButtonsState();
}

// Exposer cette fonction pour storage.js
window.updateNavButtonsState = function updateNavButtonsState() {
    document.getElementById('btn-prev-page-seq1').disabled = (currentPageSeq1 === 0);
    document.getElementById('btn-next-page-seq1').disabled = ((currentPageSeq1 + 1) * 16 >= window.masterLength);
    document.getElementById('btn-prev-page-seq2').disabled = (currentPageSeq2 === 0);
    document.getElementById('btn-next-page-seq2').disabled = ((currentPageSeq2 + 1) * 16 >= window.masterLength);
    const p3 = document.getElementById('btn-prev-page-seq3');
    const n3 = document.getElementById('btn-next-page-seq3');
    if(p3 && n3) {
        p3.disabled = (currentPageSeq3 === 0);
        n3.disabled = ((currentPageSeq3 + 1) * 16 >= window.masterLength);
    }
}

// Exposer cette fonction pour storage.js
window.refreshGridVisuals = function refreshGridVisuals() {
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    const accents = document.querySelectorAll('#grid-seq1 .accent-pad');
    if(pads.length === 0) return;
    const offset1 = currentPageSeq1 * 16;

    pads.forEach((pad, i) => {
        const realIndex = i + offset1; 
        if (realIndex >= window.masterLength) pad.classList.add('disabled'); else pad.classList.remove('disabled');
        if(window.drumSequences && window.drumSequences[currentTrackIndex]) { 
            const isActive = window.drumSequences[currentTrackIndex][realIndex]; 
            pad.classList.toggle('active', isActive); 
            const led = pad.querySelector('.led'); 
            if (led) led.style.background = isActive ? "red" : "#330000"; 
            pad.dataset.realIndex = realIndex; 
        }
        const span = pad.querySelector('span');
        if(span) span.innerText = realIndex + 1;
    });

    accents.forEach((acc, i) => {
        const realIndex = i + offset1;
        acc.dataset.realIndex = realIndex; 
        if (realIndex >= window.masterLength) { acc.style.opacity = "0.2"; acc.style.pointerEvents = "none"; } else { acc.style.opacity = "1"; acc.style.pointerEvents = "auto"; }
        if(window.drumAccents && window.drumAccents[currentTrackIndex]) { 
            const isActive = window.drumAccents[currentTrackIndex][realIndex]; 
            acc.classList.toggle('active', isActive); 
        }
    });
    
    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    const offset2 = currentPageSeq2 * 16;
    if (pads2.length > 0) pads2.forEach((pad, i) => { 
        const realIndex = i + offset2;
        pad.dataset.realIndex = realIndex;
        if (realIndex >= window.masterLength) pad.classList.add('disabled'); else pad.classList.remove('disabled');
        const isActive = window.synthSequences.seq2[realIndex]; 
        pad.classList.toggle('active', isActive); 
        const led = pad.querySelector('.led'); 
        if (led) led.style.background = isActive ? "cyan" : "#330000"; 
    });

    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    const offset3 = currentPageSeq3 * 16;
    if (pads3.length > 0) pads3.forEach((pad, i) => { 
        const realIndex = i + offset3;
        pad.dataset.realIndex = realIndex;
        if (realIndex >= window.masterLength) pad.classList.add('disabled'); else pad.classList.remove('disabled');
        const isActive = window.synthSequences.seq3[realIndex]; 
        pad.classList.toggle('active', isActive); 
        const led = pad.querySelector('.led'); 
        if (led) led.style.background = isActive ? "#a855f7" : "#330000"; 
    });
}

// Exposer cette fonction pour storage.js
window.refreshFadersVisuals = function refreshFadersVisuals(seqId) {
    const containerId = (seqId === 3) ? 'grid-freq-seq3' : 'grid-freq-seq2';
    const faders = document.querySelectorAll(`#${containerId} .freq-fader`);
    const data = (seqId === 3) ? window.freqDataSeq3 : window.freqDataSeq2;
    const page = (seqId === 3) ? currentPageSeq3 : currentPageSeq2;
    const offset = page * 16;
    faders.forEach((fader, i) => {
        const realIndex = i + offset;
        fader.dataset.realIndex = realIndex; 
        fader.value = data[realIndex] || 440; 
        if(fader.previousElementSibling) fader.previousElementSibling.innerText = fader.value + "Hz";
    });
}

// --- BOUCLES (Optimisé avec window.) ---
let globalTickCount = 0;
function runDrumLoop() {
    if (!window.isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = baseDuration;
    if (globalTickCount % 2 === 0) currentStepDuration += (baseDuration * globalSwing); else currentStepDuration -= (baseDuration * globalSwing);

    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    const offset1 = currentPageSeq1 * 16;
    pads.forEach(p => p.style.borderColor = "#333");
    const activePos = trackPositions[currentTrackIndex]; 
    if (activePos >= offset1 && activePos < offset1 + 16) {
        const localIndex = activePos - offset1;
        if(pads[localIndex]) pads[localIndex].style.borderColor = "#ffffff";
    }

    const isAnySolo = window.trackSolos.includes(true);
    for (let i = 0; i < 5; i++) {
        let pos = trackPositions[i]; 
        let len = window.masterLength; 
        let shouldPlay = true;
        if (isAnySolo) { if (!window.trackSolos[i]) shouldPlay = false; } else { if (window.trackMutes[i]) shouldPlay = false; }

        if (shouldPlay && window.drumSequences[i][pos]) {
            let acc = window.drumAccents[i][pos];
            switch(i) { 
                case 0: window.playKick(acc); break; 
                case 1: window.playSnare(acc); break; 
                case 2: window.playHiHat(false, acc); break; 
                case 3: window.playHiHat(true, acc); break; 
                case 4: window.playDrumFM(acc); break; 
            }
        }
        if (i === 0 && isMetroOn && pos % 4 === 0) { if(window.playMetronome) window.playMetronome(pos === 0); }
        trackPositions[i] = (trackPositions[i] + 1) % len;
    }
    globalTickCount++;
    timerDrums = setTimeout(runDrumLoop, currentStepDuration);
}

let synthTickCount = 0; 
let currentSynthStep = 0; 
function runSynthLoop() {
    if (!window.isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm2').innerText) || 122;
    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = baseDuration;
    if (synthTickCount % 2 === 0) currentStepDuration += (baseDuration * globalSwing); else currentStepDuration -= (baseDuration * globalSwing);

    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    const offset2 = currentPageSeq2 * 16;
    pads2.forEach(p => p.style.borderColor = "#333");
    if (currentSynthStep >= offset2 && currentSynthStep < offset2 + 16) {
        const localIndex = currentSynthStep - offset2;
        if(pads2[localIndex]) pads2[localIndex].style.borderColor = "#00f3ff";
    }
    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    const offset3 = currentPageSeq3 * 16;
    if (pads3.length > 0) {
        pads3.forEach(p => p.style.borderColor = "#333");
        if (currentSynthStep >= offset3 && currentSynthStep < offset3 + 16) {
            const localIndex = currentSynthStep - offset3;
            if(pads3[localIndex]) pads3[localIndex].style.borderColor = "#a855f7";
        }
    }

    const isActive2 = window.synthSequences.seq2[currentSynthStep];
    const isActive3 = window.synthSequences.seq3[currentSynthStep];
    if(window.playSynthStep) {
        window.playSynthStep(currentSynthStep, window.freqDataSeq2[currentSynthStep], 2, isActive2);
        if(pads3.length > 0) window.playSynthStep(currentSynthStep, window.freqDataSeq3[currentSynthStep], 3, isActive3);
    } 
    currentSynthStep = (currentSynthStep + 1) % window.masterLength;
    synthTickCount++;
    timerSynths = setTimeout(runSynthLoop, currentStepDuration);
}

// --- INPUTS & CONTROLS ---
document.addEventListener('mousedown', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        if (pad.classList.contains('disabled')) return;
        const idx = parseInt(pad.dataset.realIndex); 
        const pid = pad.closest('.step-grid').id;
        if (pid === 'grid-seq1') { window.drumSequences[currentTrackIndex][idx] = !window.drumSequences[currentTrackIndex][idx]; window.refreshGridVisuals(); } 
        else if (pid === 'grid-seq2') { window.synthSequences.seq2[idx] = !window.synthSequences.seq2[idx]; pad.classList.toggle('active', window.synthSequences.seq2[idx]); const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq2[idx] ? "cyan" : "#330000"; } 
        else if (pid === 'grid-seq3') { window.synthSequences.seq3[idx] = !window.synthSequences.seq3[idx]; pad.classList.toggle('active', window.synthSequences.seq3[idx]); const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq3[idx] ? "#a855f7" : "#330000"; }
    }
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        const idx = parseInt(accentBtn.dataset.realIndex);
        window.drumAccents[currentTrackIndex][idx] = !window.drumAccents[currentTrackIndex][idx];
        window.refreshGridVisuals();
    }
});

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('freq-fader')) {
        const val = parseFloat(e.target.value);
        const idx = parseInt(e.target.dataset.realIndex); 
        const seq = parseInt(e.target.dataset.seq);
        if (e.target.previousElementSibling) e.target.previousElementSibling.innerText = val + "Hz";
        if (seq === 2) window.freqDataSeq2[idx] = val;
        if (seq === 3) window.freqDataSeq3[idx] = val;
    }
});

function generateSmartRhythm(trackIdx) {
    window.drumSequences[trackIdx] = Array(64).fill(false);
    window.drumAccents[trackIdx] = Array(64).fill(false);
    for (let i = 0; i < window.masterLength; i++) {
        let p = Math.random();
        let stepInBar = i % 16; 
        switch(trackIdx) {
            case 0: if (stepInBar % 4 === 0) { if (p > 0.1) { window.drumSequences[trackIdx][i] = true; window.drumAccents[trackIdx][i] = true; } } else if (stepInBar % 2 !== 0) { if (p > 0.9) window.drumSequences[trackIdx][i] = true; } break;
            case 1: if (stepInBar === 4 || stepInBar === 12) { if (p > 0.05) { window.drumSequences[trackIdx][i] = true; window.drumAccents[trackIdx][i] = true; } } else if (stepInBar % 2 === 0) { if (p > 0.85) window.drumSequences[trackIdx][i] = true; } break;
            case 2: if (p > 0.3) window.drumSequences[trackIdx][i] = true; break;
            case 3: if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) { if (p > 0.2) window.drumSequences[trackIdx][i] = true; } break;
            case 4: if (p > 0.7) window.drumSequences[trackIdx][i] = true; break;
        }
    }
}

function initGrid(idPrefix) {
    const gridContainer = document.getElementById(idPrefix);
    if (!gridContainer) return;
    let htmlContent = '';
    const isDrum = (idPrefix === 'grid-seq1');
    for (let i = 0; i < 16; i++) {
        let padHTML = '';
        if (isDrum) { padHTML = `<div class="step-column"><div class="step-pad" data-index="${i}" data-type="note"><span>${i+1}</span><div class="led"></div></div><div class="accent-pad" data-index="${i}" data-type="accent" title="Accent"></div></div>`; } 
        else { padHTML = `<div class="step-pad" data-index="${i}" data-type="note"><div class="led"></div></div>`; }
        htmlContent += padHTML;
    }
    gridContainer.innerHTML = htmlContent;
}

function initFaders(idPrefix, seqId) {
    const freqGrid = document.getElementById(idPrefix);
    if (!freqGrid) return;
    let htmlContent = '';
    for (let i = 0; i < 16; i++) {
        htmlContent += `<div class="fader-unit"><span class="hz-label">440Hz</span><input type="range" class="freq-fader" data-seq="${seqId}" data-index="${i}" min="50" max="880" value="440"></div>`;
    }
    freqGrid.innerHTML = htmlContent;
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
                <div class="page-navigator" id="seq3-navigator" style="display:flex; gap:10px; margin-left:20px; align-items:center;">
                    <button class="btn-nav" id="btn-prev-page-seq3" disabled>&lt;&lt;</button>
                    <span class="page-indicator" id="page-indicator-seq3" style="font-family:'Courier New'; color:#a855f7; font-weight:bold;">1-16</span>
                    <button class="btn-nav" id="btn-next-page-seq3" disabled>&gt;&gt;</button>
                </div>
                <div style="display:flex; gap:20px; align-items:center; margin-left:auto;">
                    <div class="bpm-control"><label>VOL</label><input type="range" id="vol-seq3" min="0" max="1" step="0.01" value="0.6" style="width:60px"></div>
                </div>
            </div>
            <div class="synth-master-fixed" style="margin-bottom:15px; border-color:#a855f7;">
                <span class="label-cyan" style="color:#a855f7;">SEQ 3 PARAM ></span>
                <div class="group"><label>DISTO</label><input type="range" id="synth3-disto" min="0" max="1000" value="200"></div>
                <div class="group"><label>RES</label><input type="range" id="synth3-res" min="1" max="25" value="8"></div>
                <div class="group"><label>CUTOFF</label><input type="range" id="synth3-cutoff" min="1" max="10" step="0.1" value="2"></div>
                <div class="group"><label>DECAY</label><input type="range" id="synth3-decay" min="0.1" max="1.0" step="0.05" value="0.4"></div>
            </div>
            <div class="freq-sliders-container" id="grid-freq-seq3"></div>
            <div class="step-grid" id="grid-seq3"></div>
            <div class="synth-controls" style="display:flex; gap:10px; margin-top:10px; align-items:center;">
                <button id="btn-mute-seq3" class="btn-synth-mute" data-target="3">MUTE SEQ 3</button>
                <div class="random-unit"><button class="btn-random" data-target="3">RANDOMIZE SEQ 3</button></div>
            </div>
        </section>`;
        
        initGrid('grid-seq3'); initFaders('grid-freq-seq3', 3);
        document.getElementById('btn-prev-page-seq3').onclick = () => { if(currentPageSeq3 > 0) { currentPageSeq3--; updatePageIndicator('seq3'); refreshGridVisuals(); refreshFadersVisuals(3); }};
        document.getElementById('btn-next-page-seq3').onclick = () => { if((currentPageSeq3 + 1) * 16 < window.masterLength) { currentPageSeq3++; updatePageIndicator('seq3'); refreshGridVisuals(); refreshFadersVisuals(3); }};
        updatePageIndicator('seq3');

        document.getElementById('vol-seq3').oninput = (e) => window.synthVol3 = parseFloat(e.target.value);
        document.getElementById('synth3-disto').oninput = (e) => { if(window.updateSynth3Disto) window.updateSynth3Disto(parseFloat(e.target.value)); };
        document.getElementById('synth3-res').oninput = (e) => { if(window.updateSynth3Res) window.updateSynth3Res(parseFloat(e.target.value)); };
        document.getElementById('synth3-cutoff').oninput = (e) => { if(window.updateSynth3Cutoff) window.updateSynth3Cutoff(parseFloat(e.target.value)); };
        document.getElementById('synth3-decay').oninput = (e) => { if(window.updateSynth3Decay) window.updateSynth3Decay(parseFloat(e.target.value)); };
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

function bindControls() {
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    bind('kick-pitch', window.kickSettings, 'pitch'); bind('kick-decay', window.kickSettings, 'decay'); bind('kick-level', window.kickSettings, 'level');
    bind('snare-tone', window.snareSettings, 'tone'); bind('snare-snappy', window.snareSettings, 'snappy'); bind('snare-level', window.snareSettings, 'level');
    bind('hhc-tone', window.hhSettings, 'tone'); bind('hhc-level', window.hhSettings, 'levelClose');
    bind('hho-decay', window.hhSettings, 'decayOpen'); bind('hho-level', window.hhSettings, 'levelOpen');
    bind('fm-carrier', window.fmSettings, 'carrierPitch'); bind('fm-mod', window.fmSettings, 'modPitch'); bind('fm-amt', window.fmSettings, 'fmAmount'); bind('fm-decay', window.fmSettings, 'decay'); bind('fm-level', window.fmSettings, 'level');

    const swingSlider = document.getElementById('global-swing'); if(swingSlider) swingSlider.oninput = (e) => { globalSwing = parseInt(e.target.value) / 100; document.getElementById('swing-val').innerText = e.target.value + "%"; };
    const accSlider = document.getElementById('global-accent-amount'); if(accSlider) accSlider.oninput = (e) => { const val = parseFloat(e.target.value); if(window.updateAccentBoost) window.updateAccentBoost(val); document.getElementById('accent-val-display').innerText = val.toFixed(1) + 'x'; };
    const metroBox = document.getElementById('metro-toggle'); if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;
    
    const v2 = document.getElementById('vol-seq2'); if(v2) v2.oninput = (e) => window.synthVol2 = parseFloat(e.target.value);
    const s2disto = document.getElementById('synth2-disto'); if(s2disto) s2disto.oninput = (e) => { if(window.updateSynth2Disto) window.updateSynth2Disto(parseFloat(e.target.value)); };
    const s2res = document.getElementById('synth2-res'); if(s2res) s2res.oninput = (e) => { if(window.updateSynth2Res) window.updateSynth2Res(parseFloat(e.target.value)); };
    const s2cut = document.getElementById('synth2-cutoff'); if(s2cut) s2cut.oninput = (e) => { if(window.updateSynth2Cutoff) window.updateSynth2Cutoff(parseFloat(e.target.value)); };
    const s2dec = document.getElementById('synth2-decay'); if(s2dec) s2dec.oninput = (e) => { if(window.updateSynth2Decay) window.updateSynth2Decay(parseFloat(e.target.value)); };
    const dAmt = document.getElementById('global-delay-amt'); if(dAmt) dAmt.oninput = (e) => { if(window.updateDelayAmount) window.updateDelayAmount(parseFloat(e.target.value)); };
    const dTime = document.getElementById('global-delay-time'); if(dTime) dTime.oninput = (e) => { if(window.updateDelayTime) window.updateDelayTime(parseFloat(e.target.value)); };
    const vol = document.getElementById('master-gain'); if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);
}
