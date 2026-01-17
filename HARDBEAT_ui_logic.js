/* ==========================================
   HARDBEAT PRO - UI LOGIC (RESTORED MASTER)
   ========================================== */
let timerDrums; let timerSynths;
let isMetroOn = false; let isPlaying = false;

// --- VARIABLES MAITRESSES (L'Unique Vérité) ---
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let drumAccents = Array.from({ length: 5 }, () => Array(16).fill(false));
let synthSequences = { seq2: Array(16).fill(false), seq3: Array(16).fill(false) };

let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

let paramsSeq2 = { disto: 0, res: 5, cutoff: 4, decay: 0.2 };
let paramsSeq3 = { disto: 200, res: 8, cutoff: 2, decay: 0.4 };
let globalDelay = { amt: 0, time: 0.375 };
let globalAccentBoost = 1.4;
let globalSwing = 0.06;

let synthVol2 = 0.6;
let synthVol3 = 0.6;

let trackLengths = [16, 16, 16, 16, 16]; 
let trackPositions = [0, 0, 0, 0, 0];
let trackMutes = [false, false, false, false, false];
let trackSolos = [false, false, false, false, false];
let muteState2 = false; let muteState3 = false;
let isSaveMode = false;
let currentTrackIndex = 0;

let freqCacheSeq2 = new Array(16).fill(440);
let freqCacheSeq3 = new Array(16).fill(220);

// --- INIT GRID ---
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
        if (seq === 2) freqCacheSeq2[idx] = val;
        if (seq === 3) freqCacheSeq3[idx] = val;
    }
});

// --- SMART GENERATORS ---
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

function generateSmartSynth(seqId) {
    const targetSeq = (seqId === 2) ? synthSequences.seq2 : synthSequences.seq3;
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

// --- SAVE / LOAD ---
function savePattern(slot) {
    const data = {
        drums: {
            seq: drumSequences, accents: drumAccents, mutes: trackMutes, solos: trackSolos, lengths: trackLengths,
            settings: { 
                kick: { ...kickSettings, steps: document.getElementById('kick-steps').value },
                snare: { ...snareSettings, steps: document.getElementById('snare-steps').value },
                hhc: { ...hhSettings, steps: document.getElementById('hhc-steps').value },
                hho: { ...hhSettings, steps: document.getElementById('hho-steps').value },
                fm: { ...fmSettings, steps: document.getElementById('fm-steps').value }
            }
        },
        synths: {
            seq2: synthSequences.seq2, seq3: synthSequences.seq3,
            params2: paramsSeq2, params3: paramsSeq3,
            mutes: { seq2: muteState2, seq3: muteState3 },
            vol2: document.getElementById('vol-seq2').value,
            vol3: document.getElementById('vol-seq3') ? document.getElementById('vol-seq3').value : 0.6,
            freqs2: freqCacheSeq2, freqs3: freqCacheSeq3
        },
        global: {
            bpm1: document.getElementById('display-bpm1').innerText,
            bpm2: document.getElementById('display-bpm2').innerText,
            swing: document.getElementById('global-swing').value,
            accent: document.getElementById('global-accent-amount').value,
            delay: globalDelay
        }
    };
    localStorage.setItem(`hardbeat_pattern_${slot}`, JSON.stringify(data));
    updateMemoryUI(); 
}

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    const data = JSON.parse(json);
    
    drumSequences = data.drums.seq; drumAccents = data.drums.accents; trackMutes = data.drums.mutes; trackSolos = data.drums.solos; trackLengths = data.drums.lengths;
    const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
    
    setSlider('kick-steps', data.drums.settings.kick.steps); setSlider('kick-pitch', data.drums.settings.kick.pitch); setSlider('kick-decay', data.drums.settings.kick.decay); setSlider('kick-level', data.drums.settings.kick.level);
    setSlider('snare-steps', data.drums.settings.snare.steps); setSlider('snare-snappy', data.drums.settings.snare.snappy); setSlider('snare-tone', data.drums.settings.snare.tone); setSlider('snare-level', data.drums.settings.snare.level);
    setSlider('hhc-steps', data.drums.settings.hhc.steps); setSlider('hhc-tone', data.drums.settings.hhc.tone); setSlider('hhc-level', data.drums.settings.hhc.levelClose);
    setSlider('hho-steps', data.drums.settings.hho.steps); setSlider('hho-decay', data.drums.settings.hho.decayOpen); setSlider('hho-level', data.drums.settings.hho.levelOpen);
    setSlider('fm-steps', data.drums.settings.fm.steps); setSlider('fm-carrier', data.drums.settings.fm.carrierPitch); setSlider('fm-mod', data.drums.settings.fm.modPitch); setSlider('fm-amt', data.drums.settings.fm.fmAmount); setSlider('fm-decay', data.drums.settings.fm.decay); setSlider('fm-level', data.drums.settings.fm.level);

    document.querySelectorAll('.btn-mute').forEach((btn, i) => { if (!btn.classList.contains('btn-synth-mute')) { const track = parseInt(btn.dataset.track); btn.classList.toggle('active', trackMutes[track]); }});
    document.querySelectorAll('.btn-solo').forEach((btn, i) => { const track = parseInt(btn.dataset.track); btn.classList.toggle('active', trackSolos[track]); });

    synthSequences.seq2 = data.synths.seq2; synthSequences.seq3 = data.synths.seq3;
    const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.length > 0;
    const isSeq3Visible = document.getElementById('seq3-container');
    if (hasSeq3Data && !isSeq3Visible) document.getElementById('add-seq-btn').click();

    setSlider('vol-seq2', data.synths.vol2);
    setSlider('synth2-disto', data.synths.params2.disto); setSlider('synth2-res', data.synths.params2.res); setSlider('synth2-cutoff', data.synths.params2.cutoff); setSlider('synth2-decay', data.synths.params2.decay);
    muteState2 = data.synths.mutes.seq2;
    const btnMute2 = document.getElementById('btn-mute-seq2'); if(btnMute2) btnMute2.classList.toggle('active', muteState2);
    const faders2 = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
    if (data.synths.freqs2) faders2.forEach((f, i) => { f.value = data.synths.freqs2[i]; if(f.previousElementSibling) f.previousElementSibling.innerText = f.value + "Hz"; f.dispatchEvent(new Event('input')); });

    if (hasSeq3Data) {
        setSlider('vol-seq3', data.synths.vol3);
        setSlider('synth3-disto', data.synths.params3.disto); setSlider('synth3-res', data.synths.params3.res); setSlider('synth3-cutoff', data.synths.params3.cutoff); setSlider('synth3-decay', data.synths.params3.decay);
        muteState3 = data.synths.mutes.seq3;
        const btnMute3 = document.getElementById('btn-mute-seq3'); if(btnMute3) btnMute3.classList.toggle('active', muteState3);
        const faders3 = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
        faders3.forEach((f, i) => { f.value = data.synths.freqs3[i]; if(f.previousElementSibling) f.previousElementSibling.innerText = f.value + "Hz"; f.dispatchEvent(new Event('input')); });
    }

    document.getElementById('display-bpm1').innerText = data.global.bpm1;
    document.getElementById('display-bpm2').innerText = data.global.bpm2;
    setSlider('global-swing', data.global.swing); setSlider('global-accent-amount', data.global.accent);
    setSlider('global-delay-amt', data.global.delay.amt); setSlider('global-delay-time', data.global.delay.time);

    refreshGridVisuals();
}

function updateMemoryUI() {
    for (let i = 1; i <= 4; i++) {
        const slotBtn = document.querySelector(`.btn-mem-slot[data-slot="${i}"]`);
        if (localStorage.getItem(`hardbeat_pattern_${i}`)) slotBtn.classList.add('has-data'); else slotBtn.classList.remove('has-data');
    }
}

// --- BINDINGS ---
function bindControls() {
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    const bindSteps = (id, trackIdx) => { const el = document.getElementById(id); if (el) el.oninput = (e) => { trackLengths[trackIdx] = parseInt(e.target.value); if (trackPositions[trackIdx] >= trackLengths[trackIdx]) trackPositions[trackIdx] = 0; refreshGridVisuals(); }; };

    bindSteps('kick-steps', 0); bind('kick-pitch', kickSettings, 'pitch'); bind('kick-decay', kickSettings, 'decay'); bind('kick-level', kickSettings, 'level');
    bindSteps('snare-steps', 1); bind('snare-tone', snareSettings, 'tone'); bind('snare-snappy', snareSettings, 'snappy'); bind('snare-level', snareSettings, 'level');
    bindSteps('hhc-steps', 2); bind('hhc-tone', hhSettings, 'tone'); bind('hhc-level', hhSettings, 'levelClose');
    bindSteps('hho-steps', 3); bind('hho-decay', hhSettings, 'decayOpen'); bind('hho-level', hhSettings, 'levelOpen');
    bindSteps('fm-steps', 4); bind('fm-carrier', fmSettings, 'carrierPitch'); bind('fm-mod', fmSettings, 'modPitch'); bind('fm-amt', fmSettings, 'fmAmount'); bind('fm-decay', fmSettings, 'decay'); bind('fm-level', fmSettings, 'level');

    const swingSlider = document.getElementById('global-swing'); if(swingSlider) swingSlider.oninput = (e) => { globalSwing = parseInt(e.target.value) / 100; document.getElementById('swing-val').innerText = e.target.value + "%"; };
    const accSlider = document.getElementById('global-accent-amount'); if(accSlider) accSlider.oninput = (e) => { globalAccentBoost = parseFloat(e.target.value); if(window.updateAccentBoost) window.updateAccentBoost(globalAccentBoost); document.getElementById('accent-val-display').innerText = globalAccentBoost.toFixed(1) + 'x'; };
    const metroBox = document.getElementById('metro-toggle'); if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;

    const v2 = document.getElementById('vol-seq2'); if(v2) v2.oninput = (e) => synthVol2 = parseFloat(e.target.value);
    const s2disto = document.getElementById('synth2-disto'); if(s2disto) s2disto.oninput = (e) => { paramsSeq2.disto = parseFloat(e.target.value); if(window.updateAudioEffect) window.updateAudioEffect('disto2', paramsSeq2.disto); };
    const s2res = document.getElementById('synth2-res'); if(s2res) s2res.oninput = (e) => { paramsSeq2.res = parseFloat(e.target.value); };
    const s2cut = document.getElementById('synth2-cutoff'); if(s2cut) s2cut.oninput = (e) => { paramsSeq2.cutoff = parseFloat(e.target.value); };
    const s2dec = document.getElementById('synth2-decay'); if(s2dec) s2dec.oninput = (e) => { paramsSeq2.decay = parseFloat(e.target.value); };

    const dAmt = document.getElementById('global-delay-amt'); if(dAmt) dAmt.oninput = (e) => { globalDelay.amt = parseFloat(e.target.value); if(window.updateAudioEffect) window.updateAudioEffect('delayAmt', globalDelay.amt); };
    const dTime = document.getElementById('global-delay-time'); if(dTime) dTime.oninput = (e) => { globalDelay.time = parseFloat(e.target.value); if(window.updateAudioEffect) window.updateAudioEffect('delayTime', globalDelay.time); };
    
    const vol = document.getElementById('master-gain'); if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);

    // MEMORY BANK & CLEAR
    const btnSave = document.getElementById('btn-save-mode');
    btnSave.onclick = () => { isSaveMode = !isSaveMode; btnSave.classList.toggle('saving', isSaveMode); };

    // --- FIX CLEAR ---
    const btnClear = document.getElementById('btn-clear-all');
    if(btnClear) {
        btnClear.onclick = () => {
            drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
            drumAccents = Array.from({ length: 5 }, () => Array(16).fill(false));
            synthSequences.seq2 = Array(16).fill(false);
            synthSequences.seq3 = Array(16).fill(false);
            
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

// --- BOUCLES ---
let globalTickCount = 0;
let currentSynthStep = 0;
let synthTickCount = 0;

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
            if (i===0) window.playKick(kickSettings, acc, globalAccentBoost);
            if (i===1) window.playSnare(snareSettings, acc, globalAccentBoost);
            if (i===2) window.playHiHat(hhSettings, false, acc, globalAccentBoost);
            if (i===3) window.playHiHat(hhSettings, true, acc, globalAccentBoost);
            if (i===4) window.playDrumFM(fmSettings, acc, globalAccentBoost);
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

    if (!muteState2 && synthSequences.seq2[currentSynthStep]) window.playSynthNote(freqCacheSeq2[currentSynthStep], synthVol2, 2, paramsSeq2);
    if (!muteState3 && synthSequences.seq3[currentSynthStep]) window.playSynthNote(freqCacheSeq3[currentSynthStep] * 0.5, synthVol3, 3, paramsSeq3);

    currentSynthStep = (currentSynthStep + 1) % 16;
    synthTickCount++;
    timerSynths = setTimeout(runSynthLoop, currentStepDuration);
}

// EVENTS
document.addEventListener('mousedown', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        if (pad.classList.contains('disabled')) return;
        const idx = parseInt(pad.dataset.index);
        const pid = pad.closest('.step-grid').id;
        if (pid === 'grid-seq1') { drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx]; refreshGridVisuals(); } 
        else if (pid === 'grid-seq2') { synthSequences.seq2[idx] = !synthSequences.seq2[idx]; refreshGridVisuals(); } 
        else if (pid === 'grid-seq3') { synthSequences.seq3[idx] = !synthSequences.seq3[idx]; refreshGridVisuals(); }
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
    if (e.target.classList.contains('btn-synth-mute')) { const target = parseInt(e.target.dataset.target); if (target === 2) { muteState2 = !muteState2; e.target.classList.toggle('active', muteState2); } else if (target === 3) { muteState3 = !muteState3; e.target.classList.toggle('active', muteState3); } return; }
    if (e.target.classList.contains('btn-random')) { 
        const target = parseInt(e.target.dataset.target); generateSmartSynth(target); refreshGridVisuals(); 
        const btn = e.target; btn.style.background = (target === 3) ? "#a855f7" : "#00f3ff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); return; 
    }
    if (e.target.classList.contains('track-btn')) { 
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); 
        currentTrackIndex = parseInt(e.target.dataset.track); showParamsForTrack(currentTrackIndex); refreshGridVisuals(); 
        if (!trackMutes[currentTrackIndex]) { 
            switch(currentTrackIndex) { 
                case 0: window.playKick(kickSettings, false, globalAccentBoost); break; 
                case 1: window.playSnare(snareSettings, false, globalAccentBoost); break; 
                case 2: window.playHiHat(hhSettings, false, false, globalAccentBoost); break; 
                case 3: window.playHiHat(hhSettings, true, false, globalAccentBoost); break; 
                case 4: window.playDrumFM(fmSettings, false, globalAccentBoost); break; 
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
    console.log("UI Logic : Prêt (Reboot Stable).");
});
