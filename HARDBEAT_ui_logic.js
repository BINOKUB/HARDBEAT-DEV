/* ==========================================
   HARDBEAT PRO - UI LOGIC (RESCUE VERSION)
   ========================================== */
let timerDrums; let timerSynths;
let isMetroOn = false; let globalSwing = 0.06;
let isPlaying = false;
let trackLengths = [16, 16, 16, 16, 16]; 
let trackPositions = [0, 0, 0, 0, 0];
let currentTrackIndex = 0;
let isSaveMode = false;

// VARIABLES GLOBALES DE LOOP
let globalTickCount = 0;
let currentSynthStep = 0;
let synthTickCount = 0;

// --- SMART GENERATORS ---
function generateSmartRhythm(trackIdx) {
    window.drumSequences[trackIdx] = Array(16).fill(false);
    window.drumAccents[trackIdx] = Array(16).fill(false);
    for (let i = 0; i < 16; i++) {
        let p = Math.random();
        switch(trackIdx) {
            case 0: // KICK
                if (i % 4 === 0) { if (p > 0.1) { window.drumSequences[trackIdx][i] = true; window.drumAccents[trackIdx][i] = true; } }
                else if (i % 2 !== 0) { if (p > 0.9) window.drumSequences[trackIdx][i] = true; }
                break;
            case 1: // SNARE
                if (i === 4 || i === 12) { if (p > 0.05) { window.drumSequences[trackIdx][i] = true; window.drumAccents[trackIdx][i] = true; } }
                else if (i % 2 === 0) { if (p > 0.85) window.drumSequences[trackIdx][i] = true; }
                else { if (p > 0.95) window.drumSequences[trackIdx][i] = true; }
                break;
            case 2: // HHC
                if (p > 0.3) window.drumSequences[trackIdx][i] = true;
                if (i % 4 === 0 && Math.random() > 0.5) window.drumAccents[trackIdx][i] = true;
                break;
            case 3: // HHO
                if (i === 2 || i === 6 || i === 10 || i === 14) { if (p > 0.2) { window.drumSequences[trackIdx][i] = true; window.drumAccents[trackIdx][i] = true; } }
                else { if (p > 0.92) window.drumSequences[trackIdx][i] = true; }
                break;
            case 4: // FM
                if (p > 0.7) window.drumSequences[trackIdx][i] = true;
                if (p > 0.85) window.drumAccents[trackIdx][i] = true;
                break;
        }
    }
}

function generateSmartSynth(seqId) {
    const targetSeq = (seqId === 2) ? window.synthSequences.seq2 : window.synthSequences.seq3;
    for(let i=0; i<16; i++) targetSeq[i] = false;
    const faders = document.querySelectorAll(seqId === 2 ? '#grid-freq-seq2 .freq-fader' : '#grid-freq-seq3 .freq-fader');
    if (seqId === 2) {
        const root = 440; const scale = [root, root * 1.2, root * 1.5, root * 2.0]; 
        for(let i=0; i<16; i++) { let chance = (i % 2 !== 0) ? 0.4 : 0.1; if (Math.random() < chance) targetSeq[i] = true; }
        faders.forEach(f => { const note = scale[Math.floor(Math.random() * scale.length)]; f.value = Math.floor(note + (Math.random()*10)-5); f.dispatchEvent(new Event('input', { bubbles: true })); });
    } else {
        const root = 55; const scale = [root, root, root * 1.5];
        for(let i=0; i<16; i++) { if (i % 4 === 0) { if (Math.random() > 0.8) targetSeq[i] = true; } else { if (Math.random() > 0.3) targetSeq[i] = true; } }
        faders.forEach(f => { const note = scale[Math.floor(Math.random() * scale.length)]; f.value = Math.floor(note); f.dispatchEvent(new Event('input', { bubbles: true })); });
    }
}

// --- INIT & UI ---
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
        if (seq === 2) window.freqCacheSeq2[idx] = val;
        if (seq === 3) window.freqCacheSeq3[idx] = val;
    }
});

function bindControls() {
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    const bindSteps = (id, trackIdx) => { const el = document.getElementById(id); if (el) el.oninput = (e) => { trackLengths[trackIdx] = parseInt(e.target.value); if (trackPositions[trackIdx] >= trackLengths[trackIdx]) trackPositions[trackIdx] = 0; refreshGridVisuals(); }; };

    bindSteps('kick-steps', 0); bind('kick-pitch', window.kickSettings, 'pitch'); bind('kick-decay', window.kickSettings, 'decay'); bind('kick-level', window.kickSettings, 'level');
    bindSteps('snare-steps', 1); bind('snare-tone', window.snareSettings, 'tone'); bind('snare-snappy', window.snareSettings, 'snappy'); bind('snare-level', window.snareSettings, 'level');
    bindSteps('hhc-steps', 2); bind('hhc-tone', window.hhSettings, 'tone'); bind('hhc-level', window.hhSettings, 'levelClose');
    bindSteps('hho-steps', 3); bind('hho-decay', window.hhSettings, 'decayOpen'); bind('hho-level', window.hhSettings, 'levelOpen');
    bindSteps('fm-steps', 4); bind('fm-carrier', window.fmSettings, 'carrierPitch'); bind('fm-mod', window.fmSettings, 'modPitch'); bind('fm-amt', window.fmSettings, 'fmAmount'); bind('fm-decay', window.fmSettings, 'decay'); bind('fm-level', window.fmSettings, 'level');

    const swingSlider = document.getElementById('global-swing'); if(swingSlider) swingSlider.oninput = (e) => { globalSwing = parseInt(e.target.value) / 100; document.getElementById('swing-val').innerText = e.target.value + "%"; };
    const accSlider = document.getElementById('global-accent-amount'); if(accSlider) accSlider.oninput = (e) => { const val = parseFloat(e.target.value); if(window.updateAccentBoost) window.updateAccentBoost(val); document.getElementById('accent-val-display').innerText = val.toFixed(1) + 'x'; };
    const metroBox = document.getElementById('metro-toggle'); if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;

    const v2 = document.getElementById('vol-seq2'); if(v2) v2.oninput = (e) => window.synthVol2 = parseFloat(e.target.value);
    const s2disto = document.getElementById('synth2-disto'); if(s2disto) s2disto.oninput = (e) => { if(window.updateSynth2Disto) window.updateSynth2Disto(parseFloat(e.target.value)); };
    const s2res = document.getElementById('synth2-res'); if(s2res) s2res.oninput = (e) => { window.paramsSeq2.res = parseFloat(e.target.value); };
    const s2cut = document.getElementById('synth2-cutoff'); if(s2cut) s2cut.oninput = (e) => { window.paramsSeq2.cutoff = parseFloat(e.target.value); };
    const s2dec = document.getElementById('synth2-decay'); if(s2dec) s2dec.oninput = (e) => { window.paramsSeq2.decay = parseFloat(e.target.value); };

    const dAmt = document.getElementById('global-delay-amt'); if(dAmt) dAmt.oninput = (e) => { if(window.updateDelayAmount) window.updateDelayAmount(parseFloat(e.target.value)); };
    const dTime = document.getElementById('global-delay-time'); if(dTime) dTime.oninput = (e) => { if(window.updateDelayTime) window.updateDelayTime(parseFloat(e.target.value)); };
    
    const vol = document.getElementById('master-gain'); if(vol) vol.oninput = (e) => { const g = parseFloat(e.target.value); const master = new (window.AudioContext || window.webkitAudioContext)().createGain(); /* Hack, real gain in core */ }; 

    // MEMORY BANK & CLEAR
    const btnSave = document.getElementById('btn-save-mode');
    btnSave.onclick = () => { isSaveMode = !isSaveMode; btnSave.classList.toggle('saving', isSaveMode); };

    const btnClear = document.getElementById('btn-clear-all');
    if(btnClear) {
        btnClear.onclick = () => {
            window.drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
            window.drumAccents = Array.from({ length: 5 }, () => Array(16).fill(false));
            window.synthSequences.seq2 = Array(16).fill(false);
            window.synthSequences.seq3 = Array(16).fill(false);
            
            const allFaders = document.querySelectorAll('.freq-fader');
            allFaders.forEach(f => { f.value = 440; if(f.previousElementSibling) f.previousElementSibling.innerText = "440Hz"; f.dispatchEvent(new Event('input', { bubbles: true })); });
            
            const accSlider = document.getElementById('global-accent-amount'); if(accSlider) { accSlider.value = 1.4; accSlider.dispatchEvent(new Event('input')); }
            const swingSlider = document.getElementById('global-swing'); if(swingSlider) { swingSlider.value = 6; swingSlider.dispatchEvent(new Event('input')); }
            refreshGridVisuals();
            btnClear.innerText = "OK"; setTimeout(() => btnClear.innerText = "CLR", 500);
        };
    }

    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (isSaveMode) { savePattern(slot); btn.classList.add('flash-success'); setTimeout(() => btn.classList.remove('flash-success'), 200); isSaveMode = false; btnSave.classList.remove('saving'); } 
            else { if (localStorage.getItem(`hardbeat_pattern_${slot}`)) { loadPattern(slot); btn.classList.add('flash-success'); setTimeout(() => btn.classList.remove('flash-success'), 200); } }
        };
    });
    updateMemoryUI();
}

// --- SAVE / LOAD ---
function savePattern(slot) {
    const data = {
        drums: {
            seq: window.drumSequences, accents: window.drumAccents, mutes: window.trackMutes, solos: window.trackSolos, lengths: trackLengths,
            settings: { 
                kick: { ...window.kickSettings, steps: document.getElementById('kick-steps').value },
                snare: { ...window.snareSettings, steps: document.getElementById('snare-steps').value },
                hhc: { ...window.hhSettings, steps: document.getElementById('hhc-steps').value },
                hho: { ...window.hhSettings, steps: document.getElementById('hho-steps').value },
                fm: { ...window.fmSettings, steps: document.getElementById('fm-steps').value }
            }
        },
        synths: {
            seq2: window.synthSequences.seq2, seq3: window.synthSequences.seq3,
            params2: window.paramsSeq2, params3: window.paramsSeq3,
            mutes: { seq2: window.muteState2, seq3: window.muteState3 },
            vol2: document.getElementById('vol-seq2').value,
            vol3: document.getElementById('vol-seq3') ? document.getElementById('vol-seq3').value : 0.6,
            freqs2: Array.from(document.querySelectorAll('#grid-freq-seq2 .freq-fader')).map(f => f.value),
            freqs3: Array.from(document.querySelectorAll('#grid-freq-seq3 .freq-fader')).map(f => f.value)
        },
        global: {
            bpm1: document.getElementById('display-bpm1').innerText,
            bpm2: document.getElementById('display-bpm2').innerText,
            swing: document.getElementById('global-swing').value,
            accent: document.getElementById('global-accent-amount').value,
            delay: window.globalDelay
        }
    };
    localStorage.setItem(`hardbeat_pattern_${slot}`, JSON.stringify(data));
    updateMemoryUI(); 
}

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    const data = JSON.parse(json);
    
    window.drumSequences = data.drums.seq; window.drumAccents = data.drums.accents; window.trackMutes = data.drums.mutes; window.trackSolos = data.drums.solos; trackLengths = data.drums.lengths;
    const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
    
    setSlider('kick-steps', data.drums.settings.kick.steps); setSlider('kick-pitch', data.drums.settings.kick.pitch); setSlider('kick-decay', data.drums.settings.kick.decay); setSlider('kick-level', data.drums.settings.kick.level);
    setSlider('snare-steps', data.drums.settings.snare.steps); setSlider('snare-snappy', data.drums.settings.snare.snappy); setSlider('snare-tone', data.drums.settings.snare.tone); setSlider('snare-level', data.drums.settings.snare.level);
    setSlider('hhc-steps', data.drums.settings.hhc.steps); setSlider('hhc-tone', data.drums.settings.hhc.tone); setSlider('hhc-level', data.drums.settings.hhc.levelClose);
    setSlider('hho-steps', data.drums.settings.hho.steps); setSlider('hho-decay', data.drums.settings.hho.decayOpen); setSlider('hho-level', data.drums.settings.hho.levelOpen);
    setSlider('fm-steps', data.drums.settings.fm.steps); setSlider('fm-carrier', data.drums.settings.fm.carrierPitch); setSlider('fm-mod', data.drums.settings.fm.modPitch); setSlider('fm-amt', data.drums.settings.fm.fmAmount); setSlider('fm-decay', data.drums.settings.fm.decay); setSlider('fm-level', data.drums.settings.fm.level);

    document.querySelectorAll('.btn-mute').forEach((btn, i) => { if (!btn.classList.contains('btn-synth-mute')) { const track = parseInt(btn.dataset.track); btn.classList.toggle('active', window.trackMutes[track]); }});
    document.querySelectorAll('.btn-solo').forEach((btn, i) => { const track = parseInt(btn.dataset.track); btn.classList.toggle('active', window.trackSolos[track]); });

    window.synthSequences.seq2 = data.synths.seq2; window.synthSequences.seq3 = data.synths.seq3;
    const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.length > 0;
    const isSeq3Visible = document.getElementById('seq3-container');
    if (hasSeq3Data && !isSeq3Visible) document.getElementById('add-seq-btn').click();

    setSlider('vol-seq2', data.synths.vol2);
    setSlider('synth2-disto', data.synths.params2.disto); setSlider('synth2-res', data.synths.params2.res); setSlider('synth2-cutoff', data.synths.params2.cutoff); setSlider('synth2-decay', data.synths.params2.decay);
    window.muteState2 = data.synths.mutes.seq2;
    const btnMute2 = document.getElementById('btn-mute-seq2'); if(btnMute2) btnMute2.classList.toggle('active', window.muteState2);
    const faders2 = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
    if (data.synths.freqs2) faders2.forEach((f, i) => { f.value = data.synths.freqs2[i]; if(f.previousElementSibling) f.previousElementSibling.innerText = f.value + "Hz"; f.dispatchEvent(new Event('input')); });

    if (hasSeq3Data) {
        setSlider('vol-seq3', data.synths.vol3);
        setSlider('synth3-disto', data.synths.params3.disto); setSlider('synth3-res', data.synths.params3.res); setSlider('synth3-cutoff', data.synths.params3.cutoff); setSlider('synth3-decay', data.synths.params3.decay);
        window.muteState3 = data.synths.mutes.seq3;
        const btnMute3 = document.getElementById('btn-mute-seq3'); if(btnMute3) btnMute3.classList.toggle('active', window.muteState3);
        const faders3 = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
        faders3.forEach((f, i) => { f.value = data.synths.freqs3[i]; if(f.previousElementSibling) f.previousElementSibling.innerText = f.value + "Hz"; f.dispatchEvent(new Event('input')); });
    }

    document.getElementById('display-bpm1').innerText = data.global.bpm1;
    document.getElementById('display-bpm2').innerText = data.global.bpm2;
    setSlider('global-swing', data.global.swing); setSlider('global-accent-amount', data.global.accent);
    setSlider('global-delay-amt', data.global.delay.amt); setSlider('global-delay-time', data.global.delay.time);

    refreshGridVisuals();
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
        if(window.drumSequences && window.drumSequences[currentTrackIndex]) { const isActive = window.drumSequences[currentTrackIndex][i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "red" : "#330000"; }
    });
    accents.forEach((acc, i) => {
        if (i >= currentLen) { acc.style.opacity = "0.2"; acc.style.pointerEvents = "none"; } else { acc.style.opacity = "1"; acc.style.pointerEvents = "auto"; }
        if(window.drumAccents && window.drumAccents[currentTrackIndex]) { const isActive = window.drumAccents[currentTrackIndex][i]; acc.classList.toggle('active', isActive); }
    });
    const pads2 = document.querySelectorAll('#grid-seq2 .step-pad');
    if (pads2.length > 0) pads2.forEach((pad, i) => { const isActive = window.synthSequences.seq2[i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "cyan" : "#330000"; });
    const pads3 = document.querySelectorAll('#grid-seq3 .step-pad');
    if (pads3.length > 0) pads3.forEach((pad, i) => { const isActive = window.synthSequences.seq3[i]; pad.classList.toggle('active', isActive); const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? "#a855f7" : "#330000"; });
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
        document.getElementById('vol-seq3').oninput = (e) => window.synthVol3 = parseFloat(e.target.value);
        document.getElementById('synth3-disto').oninput = (e) => { if(window.updateSynth3Disto) window.updateSynth3Disto(parseFloat(e.target.value)); };
        document.getElementById('synth3-res').oninput = (e) => { window.paramsSeq3.res = parseFloat(e.target.value); };
        document.getElementById('synth3-cutoff').oninput = (e) => { window.paramsSeq3.cutoff = parseFloat(e.target.value); };
        document.getElementById('synth3-decay').oninput = (e) => { window.paramsSeq3.decay = parseFloat(e.target.value); };
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// --- BOUCLES ---
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

    const isAnySolo = window.trackSolos.includes(true);
    for (let i = 0; i < 5; i++) {
        let pos = trackPositions[i]; let len = trackLengths[i];
        let shouldPlay = true;
        if (isAnySolo) { if (!window.trackSolos[i]) shouldPlay = false; } else { if (window.trackMutes[i]) shouldPlay = false; }

        if (shouldPlay && window.drumSequences[i][pos]) {
            let acc = window.drumAccents[i][pos];
            if(i===0) window.playKick(window.kickSettings, acc);
            if(i===1) window.playSnare(window.snareSettings, acc);
            if(i===2) window.playHiHat(window.hhSettings, false, acc);
            if(i===3) window.playHiHat(window.hhSettings, true, acc);
            if(i===4) window.playDrumFM(window.fmSettings, acc);
        }
        if (i === 0 && isMetroOn && pos % 4 === 0) { if(window.playMetronome) window.playMetronome(pos === 0); }
        trackPositions[i] = (trackPositions[i] + 1) % len;
    }
    globalTickCount++;
    timerDrums = setTimeout(runDrumLoop, currentStepDuration);
}

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

    if (!window.muteState2 && window.synthSequences.seq2[currentSynthStep]) window.playSynthNote(window.freqCacheSeq2[currentSynthStep], window.synthVol2, 2);
    if (!window.muteState3 && window.synthSequences.seq3[currentSynthStep]) window.playSynthNote(window.freqCacheSeq3[currentSynthStep] * 0.5, window.synthVol3, 3);

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
        if (pid === 'grid-seq1') { window.drumSequences[currentTrackIndex][idx] = !window.drumSequences[currentTrackIndex][idx]; refreshGridVisuals(); } 
        else if (pid === 'grid-seq2') { window.synthSequences.seq2[idx] = !window.synthSequences.seq2[idx]; refreshGridVisuals(); } 
        else if (pid === 'grid-seq3') { window.synthSequences.seq3[idx] = !window.synthSequences.seq3[idx]; refreshGridVisuals(); }
    }
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        const idx = parseInt(accentBtn.dataset.index);
        window.drumAccents[currentTrackIndex][idx] = !window.drumAccents[currentTrackIndex][idx];
        refreshGridVisuals();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-drum-rand')) {
        const track = parseInt(e.target.dataset.track); generateSmartRhythm(track); refreshGridVisuals();
        const btn = e.target; btn.style.background = "#fff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); return;
    }
    if (e.target.classList.contains('btn-mute') && !e.target.classList.contains('btn-synth-mute')) { const track = parseInt(e.target.dataset.track); window.trackMutes[track] = !window.trackMutes[track]; e.target.classList.toggle('active', window.trackMutes[track]); if(window.trackMutes[track]) { window.trackSolos[track] = false; const soloBtn = e.target.parentElement.querySelector('.btn-solo'); if(soloBtn) soloBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-solo')) { const track = parseInt(e.target.dataset.track); window.trackSolos[track] = !window.trackSolos[track]; e.target.classList.toggle('active', window.trackSolos[track]); if(window.trackSolos[track]) { window.trackMutes[track] = false; const muteBtn = e.target.parentElement.querySelector('.btn-mute'); if(muteBtn) muteBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-synth-mute')) { const target = parseInt(e.target.dataset.target); if (target === 2) { window.muteState2 = !window.muteState2; e.target.classList.toggle('active', window.muteState2); } else if (target === 3) { window.muteState3 = !window.muteState3; e.target.classList.toggle('active', window.muteState3); } return; }
    if (e.target.classList.contains('btn-random')) { const target = parseInt(e.target.dataset.target); generateSmartSynth(target); refreshGridVisuals(); const btn = e.target; btn.style.background = (target === 3) ? "#a855f7" : "#00f3ff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); return; }
    
    if (e.target.classList.contains('track-btn')) { 
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); 
        currentTrackIndex = parseInt(e.target.dataset.track); showParamsForTrack(currentTrackIndex); refreshGridVisuals(); 
        if (!window.trackMutes[currentTrackIndex]) { 
            switch(currentTrackIndex) { 
                case 0: window.playKick(window.kickSettings, false); break; 
                case 1: window.playSnare(window.snareSettings, false); break; 
                case 2: window.playHiHat(window.hhSettings, false, false); break; 
                case 3: window.playHiHat(window.hhSettings, true, false); break; 
                case 4: window.playDrumFM(window.fmSettings, false); break; 
            } 
        } 
    }
});

window.addEventListener('load', () => {
    initGrid('grid-seq1'); initGrid('grid-seq2'); initFaders('grid-freq-seq2', 2);
    bindControls(); setupTempoDrag('display-bpm1'); setupTempoDrag('display-bpm2'); initSeq3Extension();
    currentTrackIndex = 0; showParamsForTrack(0); setTimeout(() => refreshGridVisuals(), 50);
    const playBtn = document.getElementById('master-play-stop'); 
    if (playBtn) { 
        playBtn.onclick = () => { 
            if (isPlaying) { 
                isPlaying = false; clearTimeout(timerDrums); clearTimeout(timerSynths); playBtn.innerText = "PLAY / STOP"; playBtn.style.background = "#222"; playBtn.style.color = "#fff"; 
                trackPositions = [0,0,0,0,0]; currentSynthStep = 0; globalTickCount = 0; synthTickCount = 0; 
            } else { 
                if(window.ensureAudioContext) window.ensureAudioContext();
                isPlaying = true; playBtn.innerText = "STOP"; playBtn.style.background = "#00f3ff"; playBtn.style.color = "#000"; 
                trackPositions = [0,0,0,0,0]; currentSynthStep = 0; globalTickCount = 0; synthTickCount = 0; 
                runDrumLoop(); runSynthLoop(); 
            } 
        }; 
    }
    console.log("UI Logic : Prêt (Rescue Version).");
});
