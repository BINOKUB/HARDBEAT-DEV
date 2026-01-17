/* ==========================================
   HARDBEAT PRO - UI LOGIC (STABLE + SMART SYNTH)
   ========================================== */
let timerDrums; let timerSynths;
let isMetroOn = false; let globalSwing = 0.06;
let trackLengths = [16, 16, 16, 16, 16]; 
let trackPositions = [0, 0, 0, 0, 0];
let trackMutes = [false, false, false, false, false];
let trackSolos = [false, false, false, false, false];
let muteState2 = false; let muteState3 = false;
let isSaveMode = false;

// --- SMART DRUM RANDOM (Tu l'as déjà, je le laisse tel quel) ---
function generateSmartRhythm(trackIdx) {
    drumSequences[trackIdx] = Array(16).fill(false);
    drumAccents[trackIdx] = Array(16).fill(false);
    for (let i = 0; i < 16; i++) {
        let p = Math.random();
        switch(trackIdx) {
            case 0: // KICK
                if (i % 4 === 0) { if (p > 0.1) { drumSequences[trackIdx][i] = true; drumAccents[trackIdx][i] = true; } }
                else if (i % 2 !== 0) { if (p > 0.9) drumSequences[trackIdx][i] = true; }
                break;
            case 1: // SNARE
                if (i === 4 || i === 12) { if (p > 0.05) { drumSequences[trackIdx][i] = true; drumAccents[trackIdx][i] = true; } }
                else if (i % 2 === 0) { if (p > 0.85) drumSequences[trackIdx][i] = true; }
                else { if (p > 0.95) drumSequences[trackIdx][i] = true; }
                break;
            case 2: // HHC
                if (p > 0.3) drumSequences[trackIdx][i] = true;
                if (i % 4 === 0 && Math.random() > 0.5) drumAccents[trackIdx][i] = true;
                break;
            case 3: // HHO
                if (i === 2 || i === 6 || i === 10 || i === 14) { if (p > 0.2) { drumSequences[trackIdx][i] = true; drumAccents[trackIdx][i] = true; } }
                else { if (p > 0.92) drumSequences[trackIdx][i] = true; }
                break;
            case 4: // FM
                if (p > 0.7) drumSequences[trackIdx][i] = true;
                if (p > 0.85) drumAccents[trackIdx][i] = true;
                break;
        }
    }
}

// --- SMART SYNTH RANDOM (NOUVEL AJOUT SÉCURISÉ) ---
function generateSmartSynth(seqId) {
    const targetSeq = (seqId === 2) ? synthSequences.seq2 : synthSequences.seq3;
    // Reset de la grille visuelle du synthé
    for(let i=0; i<16; i++) targetSeq[i] = false;
    
    // Sélection des faders
    const faders = document.querySelectorAll(seqId === 2 ? '#grid-freq-seq2 .freq-fader' : '#grid-freq-seq3 .freq-fader');
    
    if (seqId === 2) {
        // SEQ 2 (Lead) : Gamme Techno & Rythme Syncopé
        const root = 440; 
        const scale = [root, root * 1.2, root * 1.5, root * 2.0]; 
        
        for(let i=0; i<16; i++) { 
            let chance = (i % 2 !== 0) ? 0.4 : 0.1; // Plus de notes sur les contre-temps
            if (Math.random() < chance) targetSeq[i] = true; 
        }
        
        faders.forEach(f => { 
            const note = scale[Math.floor(Math.random() * scale.length)]; 
            f.value = Math.floor(note + (Math.random()*10)-5); // Légère déviation analogique
            f.dispatchEvent(new Event('input', { bubbles: true })); 
        });

    } else {
        // SEQ 3 (Rumble) : Basse & Rolling
        const root = 55; 
        const scale = [root, root, root * 1.5];
        
        for(let i=0; i<16; i++) { 
            if (i % 4 === 0) { if (Math.random() > 0.8) targetSeq[i] = true; } // Evite le Kick
            else { if (Math.random() > 0.3) targetSeq[i] = true; } // Remplit les vides
        }
        
        faders.forEach(f => { 
            const note = scale[Math.floor(Math.random() * scale.length)]; 
            f.value = Math.floor(note); 
            f.dispatchEvent(new Event('input', { bubbles: true })); 
        });
    }
}

// ... LE RESTE EST IDENTIQUE A TA VERSION STABLE ...

function initGrid(idPrefix) {
    const gridContainer = document.getElementById(idPrefix);
    if (!gridContainer) return;
    let htmlContent = '';
    const isDrum = (idPrefix === 'grid-seq1');
    for (let i = 0; i < 16; i++) {
        let padHTML = '';
        if (isDrum) {
            padHTML = `<div class="step-column"><div class="step-pad" data-index="${i}" data-type="note"><span>${i+1}</span><div class="led"></div></div><div class="accent-pad" data-index="${i}" data-type="accent" title="Accent"></div></div>`;
        } else {
            padHTML = `<div class="step-pad" data-index="${i}" data-type="note"><div class="led"></div></div>`;
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
        htmlContent += `<div class="fader-unit"><span class="hz-label">440Hz</span><input type="range" class="freq-fader" data-seq="${seqId}" data-index="${i}" min="50" max="880" value="440"></div>`;
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
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    const bindSteps = (id, trackIdx) => { const el = document.getElementById(id); if (el) el.oninput = (e) => { trackLengths[trackIdx] = parseInt(e.target.value); if (trackPositions[trackIdx] >= trackLengths[trackIdx]) trackPositions[trackIdx] = 0; refreshGridVisuals(); }; };

    bindSteps('kick-steps', 0); bind('kick-pitch', kickSettings, 'pitch'); bind('kick-decay', kickSettings, 'decay'); bind('kick-level', kickSettings, 'level');
    bindSteps('snare-steps', 1); bind('snare-tone', snareSettings, 'tone'); bind('snare-snappy', snareSettings, 'snappy'); bind('snare-level', snareSettings, 'level');
    bindSteps('hhc-steps', 2); bind('hhc-tone', hhSettings, 'tone'); bind('hhc-level', hhSettings, 'levelClose');
    bindSteps('hho-steps', 3); bind('hho-decay', hhSettings, 'decayOpen'); bind('hho-level', hhSettings, 'levelOpen');
    bindSteps('fm-steps', 4); bind('fm-carrier', fmSettings, 'carrierPitch'); bind('fm-mod', fmSettings, 'modPitch'); bind('fm-amt', fmSettings, 'fmAmount'); bind('fm-decay', fmSettings, 'decay'); bind('fm-level', fmSettings, 'level');

    const swingSlider = document.getElementById('global-swing'); if(swingSlider) swingSlider.oninput = (e) => { globalSwing = parseInt(e.target.value) / 100; document.getElementById('swing-val').innerText = e.target.value + "%"; };
    const accSlider = document.getElementById('global-accent-amount'); if(accSlider) accSlider.oninput = (e) => { const val = parseFloat(e.target.value); if(window.updateAccentBoost) window.updateAccentBoost(val); document.getElementById('accent-val-display').innerText = val.toFixed(1) + 'x'; };
    const metroBox = document.getElementById('metro-toggle'); if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;

    const v2 = document.getElementById('vol-seq2'); if(v2) v2.oninput = (e) => synthVol2 = parseFloat(e.target.value);
    const s2disto = document.getElementById('synth2-disto'); if(s2disto) s2disto.oninput = (e) => { if(window.updateSynth2Disto) window.updateSynth2Disto(parseFloat(e.target.value)); };
    const s2res = document.getElementById('synth2-res'); if(s2res) s2res.oninput = (e) => { if(window.updateSynth2Res) window.updateSynth2Res(parseFloat(e.target.value)); };
    const s2cut = document.getElementById('synth2-cutoff'); if(s2cut) s2cut.oninput = (e) => { if(window.updateSynth2Cutoff) window.updateSynth2Cutoff(parseFloat(e.target.value)); };
    const s2dec = document.getElementById('synth2-decay'); if(s2dec) s2dec.oninput = (e) => { if(window.updateSynth2Decay) window.updateSynth2Decay(parseFloat(e.target.value)); };

    const dAmt = document.getElementById('global-delay-amt'); if(dAmt) dAmt.oninput = (e) => { if(window.updateDelayAmount) window.updateDelayAmount(parseFloat(e.target.value)); };
    const dTime = document.getElementById('global-delay-time'); if(dTime) dTime.oninput = (e) => { if(window.updateDelayTime) window.updateDelayTime(parseFloat(e.target.value)); };
    
    const vol = document.getElementById('master-gain'); if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);

    // MEMORY BANK
    const btnSave = document.getElementById('btn-save-mode');
    btnSave.onclick = () => { isSaveMode = !isSaveMode; btnSave.classList.toggle('saving', isSaveMode); };

    const btnClear = document.getElementById('btn-clear-all');
    if(btnClear) {
        btnClear.onclick = () => {
            drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
            drumAccents = Array.from({ length: 5 }, () => Array(16).fill(false));
            synthSequences.seq2 = Array(16).fill(false);
            synthSequences.seq3 = Array(16).fill(false);
            
            const allFaders = document.querySelectorAll('.freq-fader');
            allFaders.forEach(f => { 
                f.value = 440; 
                if(f.previousElementSibling) f.previousElementSibling.innerText = "440Hz"; 
                f.dispatchEvent(new Event('input', { bubbles: true })); 
            });

            const accSlider = document.getElementById('global-accent-amount');
            if(accSlider) { accSlider.value = 1.4; accSlider.dispatchEvent(new Event('input')); }
            
            const swingSlider = document.getElementById('global-swing');
            if(swingSlider) { swingSlider.value = 6; swingSlider.dispatchEvent(new Event('input')); }

            refreshGridVisuals();
            
            btnClear.innerText = "OK"; setTimeout(() => btnClear.innerText = "CLR", 500);
        };
    }

    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (isSaveMode) {
                savePattern(slot);
                btn.classList.add('flash-success'); setTimeout(() => btn.classList.remove('flash-success'), 200);
                isSaveMode = false; btnSave.classList.remove('saving');
            } else {
                if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    loadPattern(slot);
                    btn.classList.add('flash-success'); setTimeout(() => btn.classList.remove('flash-success'), 200);
                }
            }
        };
    });
    updateMemoryUI();
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
    const currentLen = trackLengths[currentTrackIndex];
    pads.forEach((pad, i) => {
        if (i >= currentLen) pad.classList.add('disabled'); else pad.classList.remove('disabled');
        if(drumSequences && drumSequences[currentTrackIndex]) { const isActive = drumSequences[currentTrackIndex][i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "red" : "#330000"; }
    });
    accents.forEach((acc, i) => {
        if (i >= currentLen) { acc.style.opacity = "0.2"; acc.style.pointerEvents = "none"; } else { acc.style.opacity = "1"; acc.style.pointerEvents = "auto"; }
        if(drumAccents && drumAccents[currentTrackIndex]) { const isActive = drumAccents[currentTrackIndex][i]; acc.classList.toggle('active', isActive); }
    });
    
    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    if (pads2.length > 0) pads2.forEach((pad, i) => { const isActive = synthSequences.seq2[i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "cyan" : "#330000"; });
    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    if (pads3.length > 0) pads3.forEach((pad, i) => { const isActive = synthSequences.seq3[i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "#a855f7" : "#330000"; });
}

function setupTempoDrag(id) {
    const el = document.getElementById(id); if(!el) return;
    let isDragging = false, startY = 0, startVal = 0; el.style.cursor = "ns-resize";
    el.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startVal = parseInt(el.innerText); document.body.style.cursor = "ns-resize"; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (!isDragging) return; let newVal = startVal + Math.floor((startY - e.clientY) / 2); if (newVal < 40) newVal = 40; if (newVal > 300) newVal = 300; el.innerText = newVal; });
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
                    <div class="bpm-control"><label>VOL</label><input type="range" id="vol-seq3" min="0" max="1" step="0.01" value="0.6" style="width:60px"></div>
                    <div class="bpm-control"><label>SYNC</label><span style="color:#666; font-size:10px;">LOCKED TO TEMPO 2</span></div>
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
        document.getElementById('vol-seq3').oninput = (e) => synthVol3 = parseFloat(e.target.value);
        document.getElementById('synth3-disto').oninput = (e) => { if(window.updateSynth3Disto) window.updateSynth3Disto(parseFloat(e.target.value)); };
        document.getElementById('synth3-res').oninput = (e) => { if(window.updateSynth3Res) window.updateSynth3Res(parseFloat(e.target.value)); };
        document.getElementById('synth3-cutoff').oninput = (e) => { if(window.updateSynth3Cutoff) window.updateSynth3Cutoff(parseFloat(e.target.value)); };
        document.getElementById('synth3-decay').oninput = (e) => { if(window.updateSynth3Decay) window.updateSynth3Decay(parseFloat(e.target.value)); };
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// --- BOUCLES ---
let globalTickCount = 0;
function runDrumLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = baseDuration;
    if (globalTickCount % 2 === 0) currentStepDuration += (baseDuration * globalSwing); else currentStepDuration -= (baseDuration * globalSwing);

    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach(p => p.style.borderColor = "#333");
    const activePos = trackPositions[currentTrackIndex];
    if (pads[activePos]) pads[activePos].style.borderColor = "#ffffff";

    const isAnySolo = trackSolos.includes(true);
    for (let i = 0; i < 5; i++) {
        let pos = trackPositions[i]; let len = trackLengths[i];
        let shouldPlay = true;
        if (isAnySolo) { if (!trackSolos[i]) shouldPlay = false; } else { if (trackMutes[i]) shouldPlay = false; }

        if (shouldPlay && drumSequences[i][pos]) {
            let acc = drumAccents[i][pos];
            switch(i) { case 0: playKick(acc); break; case 1: playSnare(acc); break; case 2: playHiHat(false, acc); break; case 3: playHiHat(true, acc); break; case 4: playDrumFM(acc); break; }
        }
        if (i === 0 && isMetroOn && pos % 4 === 0) { if(window.playMetronome) playMetronome(pos === 0); }
        trackPositions[i] = (trackPositions[i] + 1) % len;
    }
    globalTickCount++;
    timerDrums = setTimeout(runDrumLoop, currentStepDuration);
}

let synthTickCount = 0; let currentSynthStep = 0;
function runSynthLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm2').innerText) || 122;
    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = baseDuration;
    if (synthTickCount % 2 === 0) currentStepDuration += (baseDuration * globalSwing); else currentStepDuration -= (baseDuration * globalSwing);

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
    synthTickCount++;
    timerSynths = setTimeout(runSynthLoop, currentStepDuration);
}

// --- ÉCOUTEURS ---
document.addEventListener('mousedown', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        if (pad.classList.contains('disabled')) return;
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
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        const idx = parseInt(accentBtn.dataset.index);
        drumAccents[currentTrackIndex][idx] = !drumAccents[currentTrackIndex][idx];
        refreshGridVisuals();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-drum-rand')) {
        const track = parseInt(e.target.dataset.track); generateSmartRhythm(track); refreshGridVisuals();
        const btn = e.target; btn.style.background = "#fff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); return;
    }
    if (e.target.classList.contains('btn-mute') && !e.target.classList.contains('btn-synth-mute')) { const track = parseInt(e.target.dataset.track); trackMutes[track] = !trackMutes[track]; e.target.classList.toggle('active', trackMutes[track]); if(trackMutes[track]) { trackSolos[track] = false; const soloBtn = e.target.parentElement.querySelector('.btn-solo'); if(soloBtn) soloBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-solo')) { const track = parseInt(e.target.dataset.track); trackSolos[track] = !trackSolos[track]; e.target.classList.toggle('active', trackSolos[track]); if(trackSolos[track]) { trackMutes[track] = false; const muteBtn = e.target.parentElement.querySelector('.btn-mute'); if(muteBtn) muteBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-synth-mute')) { const target = parseInt(e.target.dataset.target); if (target === 2) { muteState2 = !muteState2; e.target.classList.toggle('active', muteState2); if(window.toggleMuteSynth) window.toggleMuteSynth(2, muteState2); } else if (target === 3) { muteState3 = !muteState3; e.target.classList.toggle('active', muteState3); if(window.toggleMuteSynth) window.toggleMuteSynth(3, muteState3); } return; }
    
    // SMART SYNTH RANDOM CALL (MODIFIÉ ICI)
    if (e.target.classList.contains('btn-random')) {
        const target = parseInt(e.target.dataset.target);
        generateSmartSynth(target); // Appel du nouveau cerveau
        refreshGridVisuals();
        // Visual Effect
        const btn = e.target;
        btn.style.background = (target === 3) ? "#a855f7" : "#00f3ff"; btn.style.color = "#000";
        setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100);
        return;
    }

    if (e.target.classList.contains('track-btn')) { document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); currentTrackIndex = parseInt(e.target.dataset.track); showParamsForTrack(currentTrackIndex); refreshGridVisuals(); if (!trackMutes[currentTrackIndex]) { switch(currentTrackIndex) { case 0: if(window.playKick) playKick(); break; case 1: if(window.playSnare) playSnare(); break; case 2: if(window.playHiHat) playHiHat(false); break; case 3: if(window.playHiHat) playHiHat(true); break; case 4: if(window.playDrumFM) playDrumFM(); break; } } }
});

window.addEventListener('load', () => {
    initGrid('grid-seq1'); initGrid('grid-seq2'); initFaders('grid-freq-seq2', 2);
    bindControls(); setupTempoDrag('display-bpm1'); setupTempoDrag('display-bpm2'); initSeq3Extension();
    currentTrackIndex = 0; showParamsForTrack(0); setTimeout(() => refreshGridVisuals(), 50);
    const playBtn = document.getElementById('master-play-stop'); if (playBtn) { playBtn.onclick = () => { if (isPlaying) { isPlaying = false; clearTimeout(timerDrums); clearTimeout(timerSynths); playBtn.innerText = "PLAY / STOP"; playBtn.style.background = "#222"; playBtn.style.color = "#fff"; trackPositions = [0,0,0,0,0]; currentSynthStep = 0; globalTickCount = 0; synthTickCount = 0; } else { if (audioCtx.state === 'suspended') audioCtx.resume(); isPlaying = true; playBtn.innerText = "STOP"; playBtn.style.background = "#00f3ff"; playBtn.style.color = "#000"; trackPositions = [0,0,0,0,0]; currentSynthStep = 0; globalTickCount = 0; synthTickCount = 0; runDrumLoop(); runSynthLoop(); } }; }
    console.log("UI Logic : Prêt (Stable + Smart Synth).");
});
