/* ==========================================
   HARDBEAT PRO - UI LOGIC (V21 - FINAL FUSION)
   Inclus : Fix Mutes/Solos, Rumble Module, Steps, M/m Display
   ========================================== */

let masterTimer; 
let isMetroOn = false; 
let globalSwing = 0.06;

// --- VARIABLES GLOBALES ---
window.masterLength = 16;        
window.isSaveMode = false;
window.isChordModeSeq3 = false; 

// Mémoire ACTIVE (Ce qu'on entend)
window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
window.synthSequences = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };
window.synthAccents = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };
window.chordQualitySeq3 = Array(64).fill(false); // False = Mineur, True = Majeur
window.fmFreqData = Array(64).fill(100);
window.freqDataSeq2 = Array(64).fill(440);
window.freqDataSeq3 = Array(64).fill(440);

window.trackLengths = [16, 16, 16, 16, 16]; 
window.trackMutes = [false, false, false, false, false];
window.trackSolos = [false, false, false, false, false];
let trackCursors = [0, 0, 0, 0, 0]; 

// SYSTÈME DE MÉMOIRE
window.memorySlots = Array(8).fill(null);
window.currentMemorySlot = -1; 

// Internes
let currentPageSeq1 = 0;    
let currentPageSeq2 = 0;    
let currentPageSeq3 = 0; 
let currentTrackIndex = 0;
let globalTickCount = 0; 
let globalMasterStep = 0; 


/* ==========================================
   HELPER FUNCTIONS
   ========================================== */

function setupTempoDrag(id) {
    const el = document.getElementById(id); if(!el) return;
    let isDragging = false, startY = 0, startVal = 0; el.style.cursor = "ns-resize";
    el.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startVal = parseInt(el.innerText); document.body.style.cursor = "ns-resize"; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (!isDragging) return; let newVal = startVal + Math.floor((startY - e.clientY) / 2); if (newVal < 40) newVal = 40; if (newVal > 300) newVal = 300; el.innerText = newVal; });
    window.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = "default"; });
}

function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

// --- INIT GRID (AVEC FIX M/m) ---
function initGrid(idPrefix) {
    const gridContainer = document.getElementById(idPrefix);
    if (!gridContainer) return;
    let htmlContent = '';
    const isDrum = (idPrefix === 'grid-seq1');
    const isSeq3 = (idPrefix === 'grid-seq3'); 

    for (let i = 0; i < 16; i++) {
        let padHTML = '';
        if (isDrum) { 
            padHTML = `<div class="step-column"><div class="step-pad" data-index="${i}" data-type="note"><span>${i+1}</span><div class="led"></div></div><div class="accent-pad" data-index="${i}" data-type="accent" title="Accent"></div></div>`; 
        } 
        else if (isSeq3) {
            padHTML = `
            <div class="step-column">
                <div class="step-pad" data-index="${i}" data-type="note"><div class="led"></div></div>
                <div class="chord-type-btn" data-index="${i}" title="Min/Maj" style="width:100%; height:12px; margin-top:4px; background:#222; border:1px solid #444; border-radius:2px; cursor:pointer; display:flex; justify-content:center; align-items:center; font-size:9px; font-weight:bold; color:#555;">m</div>
            </div>`;
        }
        else { 
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

function setupLengthControls() {
    const btns = document.querySelectorAll('.btn-length');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const newLength = parseInt(btn.dataset.length);
            window.masterLength = newLength;

            for(let i=0; i<5; i++) {
                window.trackLengths[i] = newLength;
                if (trackCursors[i] >= newLength) trackCursors[i] = 0;
            }
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
    const p1 = document.getElementById('btn-prev-page-seq1');
    const n1 = document.getElementById('btn-next-page-seq1');
    if(p1) p1.onclick = () => { if(currentPageSeq1 > 0) { currentPageSeq1--; updatePageIndicator('seq1'); refreshGridVisuals(); }};
    if(n1) n1.onclick = () => { if((currentPageSeq1 + 1) * 16 < window.masterLength) { currentPageSeq1++; updatePageIndicator('seq1'); refreshGridVisuals(); }};

    const p2 = document.getElementById('btn-prev-page-seq2');
    const n2 = document.getElementById('btn-next-page-seq2');
    if(p2) p2.onclick = () => { if(currentPageSeq2 > 0) { currentPageSeq2--; updatePageIndicator('seq2'); refreshGridVisuals(); refreshFadersVisuals(2); }};
    if(n2) n2.onclick = () => { if((currentPageSeq2 + 1) * 16 < window.masterLength) { currentPageSeq2++; updatePageIndicator('seq2'); refreshGridVisuals(); refreshFadersVisuals(2); }};
}

function updatePageIndicator(seqId) {
    const indicator = document.getElementById(`page-indicator-${seqId}`);
    if(!indicator) return;
    let page = (seqId === 'seq1') ? currentPageSeq1 : (seqId === 'seq2') ? currentPageSeq2 : currentPageSeq3;
    const start = (page * 16) + 1;
    const end = (page + 1) * 16;
    indicator.innerText = `${start}-${end}`;
    updateNavButtonsState();
}

window.updateNavButtonsState = function() {
    const checkBtn = (pid, nid, page) => {
        const p = document.getElementById(pid);
        const n = document.getElementById(nid);
        if(p) p.disabled = (page === 0);
        if(n) n.disabled = ((page + 1) * 16 >= window.masterLength);
    };
    checkBtn('btn-prev-page-seq1', 'btn-next-page-seq1', currentPageSeq1);
    checkBtn('btn-prev-page-seq2', 'btn-next-page-seq2', currentPageSeq2);
    checkBtn('btn-prev-page-seq3', 'btn-next-page-seq3', currentPageSeq3);
};


// --- BINDING DES CONTROLES (C'est ici que tes Drums avaient disparu) ---
function bindControls() {
    const bind = (id, obj, prop) => { 
        const el = document.getElementById(id); 
        if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); 
    };
    
    // Steps Sliders
    const bindSteps = (id, trackIdx) => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = (e) => {
                const val = parseInt(e.target.value);
                window.trackLengths[trackIdx] = val;
                if (trackCursors[trackIdx] >= val) trackCursors[trackIdx] = 0;
                if (currentTrackIndex === trackIdx) refreshGridVisuals();
            };
        }
    };

    bindSteps('kick-steps', 0);
    bindSteps('snare-steps', 1);
    bindSteps('hhc-steps', 2);
    bindSteps('hho-steps', 3);
    bindSteps('fm-steps', 4);

    // KICK
    bind('kick-pitch', window.kickSettings, 'pitch'); 
    bind('kick-decay', window.kickSettings, 'decay'); 
    bind('kick-level', window.kickSettings, 'level');

    // SNARE
    bind('snare-tone', window.snareSettings, 'tone'); 
    bind('snare-snappy', window.snareSettings, 'snappy'); 
    bind('snare-level', window.snareSettings, 'level');

    // HI-HATS
    bind('hhc-tone', window.hhSettings, 'tone'); 
    bind('hhc-level', window.hhSettings, 'levelClose');
    bind('hho-decay', window.hhSettings, 'decayOpen'); 
    bind('hho-level', window.hhSettings, 'levelOpen');

    // FM DRUM
    bind('fm-carrier', window.fmSettings, 'carrierPitch'); 
    bind('fm-mod', window.fmSettings, 'modPitch'); 
    bind('fm-amt', window.fmSettings, 'fmAmount'); 
    bind('fm-decay', window.fmSettings, 'decay'); 
    bind('fm-level', window.fmSettings, 'level');

    // GLOBAL & SYNTHS
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
    const vol = document.getElementById('master-gain'); if(vol && window.masterGain) vol.oninput = (e) => window.masterGain.gain.value = parseFloat(e.target.value);
}

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
            case 4: if (p > 0.3) window.drumSequences[trackIdx][i] = true; break;
        }
    }
    if (trackIdx === 4) {
        for (let i = 0; i < window.masterLength; i++) {
            if (window.drumSequences[trackIdx][i]) {
                const randomFreq = Math.floor(Math.random() * (300 - 50) + 50);
                window.fmFreqData[i] = randomFreq;
            }
        }
        if (window.refreshFMFaders) window.refreshFMFaders();
    }
}

// --- EXTENSION SEQ 3 ---
function initSeq3Extension() {
    const btn = document.getElementById('add-seq-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        btn.disabled = true; btn.style.opacity = "0.3"; btn.innerText = "SEQ 3 ACTIVE";
        const zone = document.getElementById('extension-zone');
        
        zone.innerHTML = `
        <section id="seq3-container" class="rack-section synth-instance" data-id="3">
            <div class="section-header">
                <h2 style="color:#a855f7">SEQ 3 : HARDGROOVE LAYER</h2>
                <div class="page-navigator" id="seq3-navigator" style="display:flex; gap:10px; margin-left:20px; align-items:center;">
                    <button class="btn-nav" id="btn-prev-page-seq3" disabled>&lt;&lt;</button>
                    <span class="page-indicator" id="page-indicator-seq3" style="font-family:'Courier New'; color:#a855f7; font-weight:bold;">1-16</span>
                    <button class="btn-nav" id="btn-next-page-seq3" disabled>&gt;&gt;</button>
                </div>
                <div style="display:flex; gap:20px; align-items:center; margin-left:auto;">
                    <div class="bpm-control"><label>VOL</label><input type="range" id="vol-seq3" min="0" max="1" step="0.01" style="width:60px"></div>
                </div>
            </div>
            <div class="synth-master-fixed" style="margin-bottom:15px; border-color:#a855f7;">
                <span class="label-cyan" style="color:#a855f7;">SEQ 3 PARAM ></span>
                <div class="group"><label>DISTO</label><input type="range" id="synth3-disto" min="0" max="1000"></div>
                <div class="group"><label>RES</label><input type="range" id="synth3-res" min="1" max="25"></div>
                <div class="group"><label>CUTOFF</label><input type="range" id="synth3-cutoff" min="1" max="10" step="0.1"></div>
                <div class="group"><label>DECAY</label><input type="range" id="synth3-decay" min="0.1" max="1.0" step="0.05"></div>
            </div>
            <div class="freq-sliders-container" id="grid-freq-seq3"></div>
            <div class="step-grid" id="grid-seq3"></div>
            
            <div class="synth-controls" style="display:flex; gap:10px; margin-top:10px; align-items:center;">
                <button id="btn-mute-seq3" class="btn-synth-mute" data-target="3">MUTE SEQ 3</button>
                <button id="btn-chord-seq3" style="border:1px solid #a855f7; background:transparent; color:#a855f7; padding:5px 10px; cursor:pointer; font-weight:bold; font-size:11px;">CHORD: OFF</button>
                <div class="random-unit"><button class="btn-random" data-target="3">RANDOMIZE SEQ 3</button></div>
            </div>
        </section>`;
        
        if(window.paramsSeq3) {
            document.getElementById('synth3-disto').value = window.paramsSeq3.disto;
            document.getElementById('synth3-res').value = window.paramsSeq3.res;
            document.getElementById('synth3-cutoff').value = window.paramsSeq3.cutoff;
            document.getElementById('synth3-decay').value = window.paramsSeq3.decay;
        }
        if(window.synthVol3 !== undefined) {
             document.getElementById('vol-seq3').value = window.synthVol3;
        }

        const btnChord = document.getElementById('btn-chord-seq3');
        if(btnChord) {
             if(window.isChordModeSeq3) {
                btnChord.innerText = "CHORD: ON"; btnChord.style.background = "#a855f7"; btnChord.style.color = "#000";
            } else {
                btnChord.innerText = "CHORD: OFF"; btnChord.style.background = "transparent"; btnChord.style.color = "#a855f7";
            }
            btnChord.onclick = () => {
                window.isChordModeSeq3 = !window.isChordModeSeq3;
                if(window.isChordModeSeq3) {
                    btnChord.innerText = "CHORD: ON"; btnChord.style.background = "#a855f7"; btnChord.style.color = "#000";
                } else {
                    btnChord.innerText = "CHORD: OFF"; btnChord.style.background = "transparent"; btnChord.style.color = "#a855f7";
                }
            };
        }

        initGrid('grid-seq3'); 
        initFaders('grid-freq-seq3', 3);
        
        document.getElementById('btn-prev-page-seq3').onclick = () => { if(currentPageSeq3 > 0) { currentPageSeq3--; updatePageIndicator('seq3'); refreshGridVisuals(); refreshFadersVisuals(3); }};
        document.getElementById('btn-next-page-seq3').onclick = () => { if((currentPageSeq3 + 1) * 16 < window.masterLength) { currentPageSeq3++; updatePageIndicator('seq3'); refreshGridVisuals(); refreshFadersVisuals(3); }};
        updatePageIndicator('seq3');

        refreshFadersVisuals(3);

        document.getElementById('vol-seq3').oninput = (e) => window.synthVol3 = parseFloat(e.target.value);
        
        document.getElementById('synth3-disto').oninput = (e) => { 
            const val = parseFloat(e.target.value);
            if(window.updateSynth3Disto) window.updateSynth3Disto(val);
        };
        document.getElementById('synth3-res').oninput = (e) => { if(window.updateSynth3Res) window.updateSynth3Res(parseFloat(e.target.value)); };
        document.getElementById('synth3-cutoff').oninput = (e) => { if(window.updateSynth3Cutoff) window.updateSynth3Cutoff(parseFloat(e.target.value)); };
        document.getElementById('synth3-decay').oninput = (e) => { if(window.updateSynth3Decay) window.updateSynth3Decay(parseFloat(e.target.value)); };
        
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
        
        refreshGridVisuals();
    });
}

function initAudioPreview() {
    const triggerPreview = (target, type) => {
        const section = target.closest('.rack-section');
        if (!section) return;

        let seqId = parseInt(section.dataset.id);
        if (isNaN(seqId)) {
            if (section.id && section.id.includes('seq2')) seqId = 2;
            if (section.id && section.id.includes('seq3')) seqId = 3;
        }

        if (seqId !== 2 && seqId !== 3) return;

        let freq = 0;
        if (type === 'fader') {
            freq = parseFloat(target.value);
        } 
        else if (type === 'pad') {
            let index = 0;
            const col = target.closest('.step-column');
            if (col) {
                const grid = col.parentElement;
                index = Array.from(grid.children).indexOf(col);
            } else {
                const grid = target.parentElement;
                index = Array.from(grid.children).indexOf(target);
            }
            if (seqId === 2 && window.freqDataSeq2) freq = window.freqDataSeq2[index];
            if (seqId === 3 && window.freqDataSeq3) freq = window.freqDataSeq3[index];
        }

        if (window.playSynthSound && freq > 20) {
            window.playSynthSound(seqId, freq, 0.1, 0, 0);
        }
    };
    document.addEventListener('input', (e) => { if (e.target.classList.contains('freq-fader')) triggerPreview(e.target, 'fader'); });
    document.addEventListener('click', (e) => { const pad = e.target.closest('.step-pad'); if (pad && pad.classList.contains('active')) triggerPreview(pad, 'pad'); });
}

function initFMExtension() {
    const grid1 = document.getElementById('grid-seq1');
    if(!grid1) return;
    
    const fmContainer = document.createElement('div');
    fmContainer.id = 'fm-faders-container';
    
    let html = '';
    for(let i=0; i<16; i++) {
        html += `<div class="fm-fader-unit"><span class="fm-hz-label">100</span><input type="range" class="fm-freq-fader" data-index="${i}" min="40" max="400" value="100" step="1"></div>`;
    }
    fmContainer.innerHTML = html;
    const section = grid1.closest('.rack-section');
    section.appendChild(fmContainer); 

    const faders = fmContainer.querySelectorAll('.fm-freq-fader');
    faders.forEach(f => {
        f.oninput = (e) => {
            const val = parseInt(e.target.value);
            const idx = parseInt(e.target.dataset.realIndex); 
            if(!isNaN(idx)) window.fmFreqData[idx] = val;
            const label = e.target.previousElementSibling;
            if(label) label.innerText = val;
        };
    });
}

function refreshFMFaders() {
    const container = document.getElementById('fm-faders-container');
    if(!container) return;
    if(currentTrackIndex === 4) container.classList.add('visible');
    else { container.classList.remove('visible'); return; }

    const faders = container.querySelectorAll('.fm-freq-fader');
    const offset = currentPageSeq1 * 16; 

    faders.forEach((f, i) => {
        const realIndex = i + offset;
        f.dataset.realIndex = realIndex; 
        const val = window.fmFreqData[realIndex] || 100;
        f.value = val;
        const label = f.previousElementSibling;
        if(label) label.innerText = val;
        
        if(realIndex >= window.masterLength) { f.disabled = true; f.style.opacity = "0.2"; } 
        else { f.disabled = false; f.style.opacity = "1"; }
    });
}


/* ==========================================
   MAIN INIT 
   ========================================== */
window.addEventListener('load', () => {
    console.log("Initialisation Logic V21 (FULL SYNC)...");
    
    if (!window.audioCtx) console.error("ERREUR : audio.js manquant !");

    initGrid('grid-seq1'); 
    initFMExtension();
    initGrid('grid-seq2'); 
    initFaders('grid-freq-seq2', 2);
    
    const initialFaders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
    initialFaders.forEach((f, i) => { window.freqDataSeq2[i] = parseFloat(f.value); });

    if(window.kickSettings) bindControls(); 
    else alert("Erreur Moteur Audio");

    setupTempoDrag('display-bpm1'); 
    initSeq3Extension();
    setupLengthControls();
    setupPageNavigation();

    currentTrackIndex = 0; 
    showParamsForTrack(0); 
    
    // CHARGEMENT DU SYSTEME MPC
    if(typeof initMPCMemory === 'function') initMPCMemory();
    
    refreshGridVisuals();
    refreshFadersVisuals(2);

    const playBtn = document.getElementById('master-play-stop');
    if (playBtn) playBtn.onclick = () => togglePlay(playBtn);
   
    setTimeout(initAudioPreview, 800);

    /* ==========================================
       LISTENERS MANUELS (Au cas où bindControls rate)
       ========================================== */
    
    // 1. KICK LISTENERS
    document.getElementById('kick-pitch').addEventListener('input', (e) => window.kickSettings.pitch = parseFloat(e.target.value));
    document.getElementById('kick-decay').addEventListener('input', (e) => window.kickSettings.decay = parseFloat(e.target.value));
    document.getElementById('kick-level').addEventListener('input', (e) => window.kickSettings.level = parseFloat(e.target.value));
    
    // RUMBLE (Vérification présence via Module)
    // On n'ajoute PAS de listener ici car modules.js s'en occupe déjà lors de la création de 'kick-rumble-amount'

    // 2. SNARE LISTENERS
    document.getElementById('snare-tone').addEventListener('input', (e) => window.snareSettings.tone = parseFloat(e.target.value));
    document.getElementById('snare-snappy').addEventListener('input', (e) => window.snareSettings.snappy = parseFloat(e.target.value));
    document.getElementById('snare-level').addEventListener('input', (e) => window.snareSettings.level = parseFloat(e.target.value));

    // 3. HI-HATS LISTENERS
    document.getElementById('hhc-tone').addEventListener('input', (e) => window.hhSettings.tone = parseFloat(e.target.value));
    document.getElementById('hhc-level').addEventListener('input', (e) => window.hhSettings.levelClose = parseFloat(e.target.value));
    document.getElementById('hho-decay').addEventListener('input', (e) => window.hhSettings.decayOpen = parseFloat(e.target.value));
    document.getElementById('hho-level').addEventListener('input', (e) => window.hhSettings.levelOpen = parseFloat(e.target.value));

    // 4. FM DRUM LISTENERS
    document.getElementById('fm-carrier').addEventListener('input', (e) => window.fmSettings.carrierPitch = parseFloat(e.target.value));
    document.getElementById('fm-mod').addEventListener('input', (e) => window.fmSettings.modPitch = parseFloat(e.target.value));
    document.getElementById('fm-amt').addEventListener('input', (e) => window.fmSettings.fmAmount = parseFloat(e.target.value));
    document.getElementById('fm-decay').addEventListener('input', (e) => window.fmSettings.decay = parseFloat(e.target.value));
    document.getElementById('fm-level').addEventListener('input', (e) => window.fmSettings.level = parseFloat(e.target.value));

    console.log("✅ All Drum Knobs Synced.");
});

// --- PLAYBACK ENGINE ---

function togglePlay(btn) {
    if (!window.audioCtx) return;

    if (window.isPlaying) {
        window.isPlaying = false; 
        clearTimeout(masterTimer); 
        btn.innerText = "PLAY / STOP"; btn.style.background = "#222"; btn.style.color = "#fff";
        globalTickCount = 0; globalMasterStep = 0;
        trackCursors = [0, 0, 0, 0, 0]; 
        currentSynthStep = 0;
        refreshGridVisuals(); 
    } else {
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        window.isPlaying = true; 
        btn.innerText = "STOP"; btn.style.background = "#00f3ff"; btn.style.color = "#000";
        trackCursors = [0, 0, 0, 0, 0];
        globalMasterStep = 0; globalTickCount = 0; currentSynthStep = 0;
        runMasterClock(); 
    }
}

function runMasterClock() {
    if (!window.isPlaying) return;

    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const bpm2Display = document.getElementById('display-bpm2');
    if(bpm2Display && bpm2Display.innerText != bpm) bpm2Display.innerText = bpm;

    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = (globalTickCount % 2 === 0) ? baseDuration * (1 + globalSwing) : baseDuration * (1 - globalSwing);

    triggerDrums();
    triggerSynths(globalMasterStep);
    updatePlayheads();

    for(let i=0; i<5; i++) { trackCursors[i] = (trackCursors[i] + 1) % window.trackLengths[i]; }
    globalMasterStep = (globalMasterStep + 1) % window.masterLength;
    globalTickCount++;

    masterTimer = setTimeout(runMasterClock, currentStepDuration);
}

function triggerDrums() {
    const isAnySolo = window.trackSolos.includes(true);
    for (let i = 0; i < 5; i++) {
        let pos = trackCursors[i]; 
        let shouldPlay = true;
        if (isAnySolo) { if (!window.trackSolos[i]) shouldPlay = false; } else { if (window.trackMutes[i]) shouldPlay = false; }

        if (shouldPlay && window.drumSequences[i][pos]) {
            let acc = window.drumAccents[i][pos];
            if(i===0 && window.playKick) window.playKick(acc);
            if(i===1 && window.playSnare) window.playSnare(acc);
            if(i===2 && window.playHiHat) window.playHiHat(false, acc);
            if(i===3 && window.playHiHat) window.playHiHat(true, acc);
            if(i===4 && window.playDrumFM) window.playDrumFM(acc, pos);
        }
        if (i === 0 && isMetroOn && globalTickCount % 4 === 0) { 
            if(window.playMetronome) window.playMetronome(globalTickCount % 16 === 0); 
        }
    }
}

let currentSynthStep = 0;
function triggerSynths(masterStep) {
    if(window.playSynthStep) {
        const isActive2 = window.synthSequences.seq2[masterStep];
        let isAccent2 = false;
        if(window.synthAccents && window.synthAccents.seq2) isAccent2 = window.synthAccents.seq2[masterStep];
        if(window.freqDataSeq2) window.playSynthStep(masterStep, window.freqDataSeq2[masterStep], 2, isActive2, isAccent2);

        const isActive3 = window.synthSequences.seq3[masterStep];
        let isAccent3 = false;
        if(window.synthAccents && window.synthAccents.seq3) isAccent3 = window.synthAccents.seq3[masterStep];
        if(window.freqDataSeq3) window.playSynthStep(masterStep, window.freqDataSeq3[masterStep], 3, isActive3, isAccent3);
    }
}

function updatePlayheads() {
    const pads1 = document.querySelectorAll('#grid-seq1 .step-pad');
    const offset1 = currentPageSeq1 * 16;
    const activeCursor = trackCursors[currentTrackIndex];
    pads1.forEach((p, index) => {
        const realIndex = index + offset1; 
        p.style.borderColor = "#333"; 
        if (realIndex === activeCursor) p.style.borderColor = "#ffffff";
    });

    ['seq2', 'seq3'].forEach((seqKey, idx) => {
        const seqNum = idx + 2; 
        const padsS = document.querySelectorAll(`#grid-seq${seqNum} .step-pad`);
        const currentPage = (seqNum === 2) ? currentPageSeq2 : currentPageSeq3;
        const offsetS = currentPage * 16;
        const color = (seqNum === 2) ? "#00f3ff" : "#a855f7";
        if (padsS.length > 0) {
            if (globalMasterStep >= offsetS && globalMasterStep < offsetS + 16) {
                const visualIndex = globalMasterStep - offsetS;
                padsS.forEach(p => p.style.borderColor = "#333");
                if(padsS[visualIndex]) padsS[visualIndex].style.borderColor = color;
            } else { padsS.forEach(p => p.style.borderColor = "#333"); }
        }
    });
}

// --- REFRESH GRID VISUALS (AVEC FIX M/m) ---
window.refreshGridVisuals = function() {
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    const accents = document.querySelectorAll('#grid-seq1 .accent-pad');
    if(pads.length === 0) return;
    const offset1 = currentPageSeq1 * 16;
    const currentTrackLen = window.trackLengths[currentTrackIndex]; 

    pads.forEach((pad, i) => {
        const realIndex = i + offset1; 
        if (realIndex >= window.masterLength) { pad.classList.add('disabled'); pad.style.opacity = "0.2"; } 
        else { pad.classList.remove('disabled'); pad.style.opacity = (realIndex >= currentTrackLen) ? "0.3" : "1"; }
        
        if(window.drumSequences && window.drumSequences[currentTrackIndex]) { 
            const isActive = window.drumSequences[currentTrackIndex][realIndex]; 
            pad.classList.toggle('active', isActive); 
            const led = pad.querySelector('.led'); 
            if (realIndex >= currentTrackLen) { if(led) led.style.background = "#111"; } 
            else { if (led) led.style.background = isActive ? "red" : "#330000"; }
            pad.dataset.realIndex = realIndex; 
        }
        const span = pad.querySelector('span'); if(span) span.innerText = realIndex + 1;
    });

    accents.forEach((acc, i) => {
        const realIndex = i + offset1; acc.dataset.realIndex = realIndex; 
        if (realIndex >= window.masterLength) { acc.style.opacity = "0.1"; acc.style.pointerEvents = "none"; } 
        else { acc.style.opacity = (realIndex >= currentTrackLen) ? "0.2" : "1"; acc.style.pointerEvents = "auto"; }
        if(window.drumAccents && window.drumAccents[currentTrackIndex]) { acc.classList.toggle('active', window.drumAccents[currentTrackIndex][realIndex]); }
    });
    
    // UPDATE SYNTH GRIDS
    const updateSynthGrid = (seqKey, seqNum, page) => {
        const padsS = document.querySelectorAll(`#grid-seq${seqNum} .step-pad`);
        const offsetS = page * 16;
        const color = (seqNum === 2) ? "cyan" : "#a855f7";
        if (padsS.length > 0) padsS.forEach((pad, i) => { 
            const realIndex = i + offsetS; pad.dataset.realIndex = realIndex;
            if (realIndex >= window.masterLength) { pad.classList.add('disabled'); pad.style.opacity = "0.2"; } 
            else { pad.classList.remove('disabled'); pad.style.opacity = "1"; }
            const isActive = window.synthSequences[seqKey][realIndex]; 
            pad.classList.toggle('active', isActive); 
            const led = pad.querySelector('.led'); if (led) led.style.background = isActive ? color : "#330000"; 
        });

        if (seqNum === 3) {
            const chordBtns = document.querySelectorAll('#grid-seq3 .chord-type-btn');
            chordBtns.forEach((btn, i) => {
                const realIndex = i + offsetS; btn.dataset.realIndex = realIndex;
                if (realIndex >= window.masterLength) { btn.style.opacity = "0.2"; btn.style.pointerEvents = "none"; }
                else { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
                
                const isMaj = window.chordQualitySeq3[realIndex];
                if (isMaj) { 
                    btn.style.background = "#ffaa00"; btn.style.borderColor = "#ffaa00"; btn.style.color = "#000";
                    btn.innerText = "M";      
                } 
                else { 
                    btn.style.background = "#222"; btn.style.borderColor = "#444"; btn.style.color = "#555";
                    btn.innerText = "m";      
                }
            });
        }
    };
    updateSynthGrid('seq2', 2, currentPageSeq2);
    if(window.synthSequences.seq3) updateSynthGrid('seq3', 3, currentPageSeq3);
    refreshFMFaders();
};

window.refreshFadersVisuals = function(seqId) {
    const containerId = (seqId === 3) ? 'grid-freq-seq3' : 'grid-freq-seq2';
    const faders = document.querySelectorAll(`#${containerId} .freq-fader`);
    const data = (seqId === 3) ? window.freqDataSeq3 : window.freqDataSeq2;
    const page = (seqId === 3) ? currentPageSeq3 : currentPageSeq2;
    const offset = page * 16;
    faders.forEach((fader, i) => {
        const realIndex = i + offset; fader.dataset.realIndex = realIndex; 
        const val = data[realIndex] || 440; fader.value = val; 
        if(fader.previousElementSibling) fader.previousElementSibling.innerText = val + "Hz";
    });
};

document.addEventListener('mousedown', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        if (pad.classList.contains('disabled')) return;
        const idx = parseInt(pad.dataset.realIndex);
        if (isNaN(idx)) return; 
        const pid = pad.closest('.step-grid').id;
        if (pid === 'grid-seq1') { window.drumSequences[currentTrackIndex][idx] = !window.drumSequences[currentTrackIndex][idx]; refreshGridVisuals(); } 
        else if (pid === 'grid-seq2') { window.synthSequences.seq2[idx] = !window.synthSequences.seq2[idx]; pad.classList.toggle('active'); const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq2[idx] ? "cyan" : "#330000"; } 
        else if (pid === 'grid-seq3') { window.synthSequences.seq3[idx] = !window.synthSequences.seq3[idx]; pad.classList.toggle('active'); const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq3[idx] ? "#a855f7" : "#330000"; }
    }
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        const idx = parseInt(accentBtn.dataset.realIndex);
        window.drumAccents[currentTrackIndex][idx] = !window.drumAccents[currentTrackIndex][idx];
        accentBtn.classList.toggle('active');
    }
    const chordTypeBtn = e.target.closest('.chord-type-btn');
    if (chordTypeBtn) {
        const idx = parseInt(chordTypeBtn.dataset.realIndex);
        if (!isNaN(idx)) { window.chordQualitySeq3[idx] = !window.chordQualitySeq3[idx]; refreshGridVisuals(); }
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

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-drum-rand')) { const track = parseInt(e.target.dataset.track); generateSmartRhythm(track); refreshGridVisuals(); return; }
    if (e.target.classList.contains('track-btn')) { document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); currentTrackIndex = parseInt(e.target.dataset.track); showParamsForTrack(currentTrackIndex); refreshGridVisuals(); }
    if (e.target.classList.contains('btn-mute') && !e.target.classList.contains('btn-synth-mute')) { const track = parseInt(e.target.dataset.track); window.trackMutes[track] = !window.trackMutes[track]; e.target.classList.toggle('active', window.trackMutes[track]); if(window.trackMutes[track]) { window.trackSolos[track] = false; const soloBtn = e.target.parentElement.querySelector('.btn-solo'); if(soloBtn) soloBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-solo')) { const track = parseInt(e.target.dataset.track); window.trackSolos[track] = !window.trackSolos[track]; e.target.classList.toggle('active', window.trackSolos[track]); if(window.trackSolos[track]) { window.trackMutes[track] = false; const muteBtn = e.target.parentElement.querySelector('.btn-mute'); if(muteBtn) muteBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-synth-mute')) { const target = parseInt(e.target.dataset.target); if(window.toggleMuteSynth) window.toggleMuteSynth(target, !e.target.classList.contains('active')); e.target.classList.toggle('active'); return; }
    if (e.target.classList.contains('btn-random')) { const target = parseInt(e.target.dataset.target); const selector = (target === 3) ? '#grid-freq-seq3 .freq-fader' : '#grid-freq-seq2 .freq-fader'; const faders = document.querySelectorAll(selector); const btn = e.target; btn.style.background = (target === 3) ? "#a855f7" : "#00f3ff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); faders.forEach(fader => { const randomFreq = Math.floor(Math.random() * (880 - 50) + 50); fader.value = randomFreq; fader.dispatchEvent(new Event('input', { bubbles: true })); }); return; }
});

/* ==========================================
   MPC MEMORY SYSTEM IMPLEMENTATION (V18)
   ========================================== */

function initMPCMemory() {
    console.log("Init MPC Memory 8 Slots (With Persistence)...");
    
    const savedData = localStorage.getItem('hardbeat_memories');
    if (savedData) {
        try {
            window.memorySlots = JSON.parse(savedData);
            console.log("Mémoires restaurées depuis le disque.");
        } catch (e) {
            console.error("Erreur lecture mémoire", e);
        }
    }

    const btnSave = document.getElementById('btn-mem-save');
    const btnClear = document.getElementById('btn-mem-clear');
    const pads = document.querySelectorAll('.mem-pad');

    if (!btnSave || pads.length === 0) return;
    
    updateMemoryVisuals();

    pads.forEach(pad => {
        pad.addEventListener('click', () => {
            const slot = parseInt(pad.dataset.slot);
            handleSlotAction(slot);
        });
    });

    btnSave.addEventListener('click', () => {
        window.isSaveMode = !window.isSaveMode;
        btnSave.classList.toggle('active', window.isSaveMode);
        document.querySelectorAll('.mem-pad').forEach(p => p.classList.toggle('save-mode', window.isSaveMode));
        if(window.isSaveMode) btnClear.classList.remove('active'); 
    });

   btnClear.addEventListener('click', () => {
        if(confirm("Vider la séquence actuelle à l'écran ?\n(Vos mémoires sauvegardées ne seront PAS effacées)")) {
            
            window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
            window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
            window.synthSequences.seq2 = Array(64).fill(false);
            window.synthSequences.seq3 = Array(64).fill(false);
            if(window.synthAccents.seq2) window.synthAccents.seq2 = Array(64).fill(false);
            if(window.synthAccents.seq3) window.synthAccents.seq3 = Array(64).fill(false);

            window.masterLength = 16;
            window.trackLengths = [16, 16, 16, 16, 16];

            document.querySelectorAll('.btn-length').forEach(b => 
                b.classList.toggle('active', b.dataset.length == "16")
            );

            currentPageSeq1 = 0; currentPageSeq2 = 0; currentPageSeq3 = 0;
            if(document.getElementById('page-indicator-seq1')) updatePageIndicator('seq1');
            if(document.getElementById('page-indicator-seq2')) updatePageIndicator('seq2');
            if(document.getElementById('page-indicator-seq3')) updatePageIndicator('seq3');

            refreshGridVisuals();
            refreshFadersVisuals(2);
            if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);

            window.currentMemorySlot = -1; 
            updateMemoryVisuals();
        }
    });

    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT') return;
        const key = e.key;
        if(key >= '1' && key <= '8') {
            const slotIndex = parseInt(key) - 1;
            handleSlotAction(slotIndex);
        }
    });

   pads.forEach(pad => {
        pad.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            const slot = parseInt(pad.dataset.slot);
            
            if (window.memorySlots[slot] !== null) {
                if(confirm(`Vider seulement la mémoire ${slot + 1} ?`)) {
                    window.memorySlots[slot] = null; 
                    localStorage.setItem('hardbeat_memories', JSON.stringify(window.memorySlots));

                    if (window.currentMemorySlot === slot) {
                        window.location.reload();
                    } else {
                        updateMemoryVisuals();
                    }
                }
            }
        });
    });
}

function handleSlotAction(slotIndex) {
    if (window.isSaveMode) {
        saveToSlot(slotIndex);
        const pad = document.querySelector(`.mem-pad[data-slot="${slotIndex}"]`);
        if(pad) {
            pad.style.backgroundColor = "#fff";
            setTimeout(() => { pad.style.backgroundColor = ""; updateMemoryVisuals(); }, 200);
        }
        window.isSaveMode = false;
        document.getElementById('btn-mem-save').classList.remove('active');
        document.querySelectorAll('.mem-pad').forEach(p => p.classList.remove('save-mode'));

    } else {
        if (window.memorySlots[slotIndex] !== null) {
            loadFromSlot(slotIndex);
            window.currentMemorySlot = slotIndex;
            updateMemoryVisuals();
        }
    }
}

// --- SAVE TO SLOT (AVEC SOLOS + RUMBLE + MUTES) ---
function saveToSlot(index) {
    window.currentMemorySlot = index;

    const state = {
        global: {
            len: window.masterLength,
            trackLens: [...window.trackLengths],
            bpm: parseInt(document.getElementById('display-bpm1').innerText),
            swing: globalSwing
        },
        controls: {
            isChordMode: window.isChordModeSeq3, 
            delay: parseFloat(document.getElementById('global-delay-amt').value) || 0,
            
            s2: { ...window.paramsSeq2, vol: window.synthVol2 }, 
            s3: { ...window.paramsSeq3, vol: window.synthVol3 },

            kick: { ...window.kickSettings },
            snare: { ...window.snareSettings },
            hh: { ...window.hhSettings },
            fm: { ...window.fmSettings }
        },
        drums: {
            seq: window.drumSequences.map(s => [...s]),
            acc: window.drumAccents.map(s => [...s])
        },
        synths: {
            seq2: [...window.synthSequences.seq2],
            seq3: [...window.synthSequences.seq3],
            acc2: window.synthAccents.seq2 ? [...window.synthAccents.seq2] : Array(64).fill(false),
            acc3: window.synthAccents.seq3 ? [...window.synthAccents.seq3] : Array(64).fill(false)
        },
        freqs: {
            seq2: [...window.freqDataSeq2],
            seq3: [...window.freqDataSeq3],
            fm: [...window.fmFreqData]
        },
        chords: {
            qual: [...window.chordQualitySeq3]
        },
        mutes: [...window.trackMutes],
        solos: [...window.trackSolos] 
    };
    
    window.memorySlots[index] = state;
    localStorage.setItem('hardbeat_memories', JSON.stringify(window.memorySlots));
    console.log(`Slot ${index + 1} Saved (WITH SOLOS/MUTES/RUMBLE).`);
}

// --- LOAD FROM SLOT (AVEC SOLOS + RUMBLE + MUTES) ---
function loadFromSlot(index) {
    const state = window.memorySlots[index];
    if (!state) return;

    const forceUpdateKnob = (id, val) => {
        const el = document.getElementById(id);
        if (el && typeof val === 'number') {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    if (state.global) {
        window.masterLength = state.global.len || 16;
        window.trackLengths = state.global.trackLens || [16,16,16,16,16];
        document.querySelectorAll('.btn-length').forEach(btn => {
            const val = parseInt(btn.dataset.length);
            btn.classList.toggle('active', val === window.masterLength);
        });
        if (state.global.bpm) document.getElementById('display-bpm1').innerText = state.global.bpm;
        if (state.global.swing !== undefined) {
            globalSwing = state.global.swing;
            forceUpdateKnob('global-swing', globalSwing * 100);
        }
    }

    if (state.controls) {
        if(state.controls.delay !== undefined) forceUpdateKnob('global-delay-amt', state.controls.delay);

        window.isChordModeSeq3 = state.controls.isChordMode;
        const btnChord = document.getElementById('btn-chord-seq3');
        if (btnChord) {
            if(window.isChordModeSeq3) {
                 btnChord.innerText = "CHORD: ON"; btnChord.style.background = "#a855f7"; btnChord.style.color = "#000";
            } else {
                 btnChord.innerText = "CHORD: OFF"; btnChord.style.background = "transparent"; btnChord.style.color = "#a855f7";
            }
        }

        if(state.controls.s2) {
            window.paramsSeq2 = { ...state.controls.s2 };
            window.synthVol2 = state.controls.s2.vol;
            forceUpdateKnob('synth2-disto', window.paramsSeq2.disto);
            forceUpdateKnob('synth2-res', window.paramsSeq2.res);
            forceUpdateKnob('synth2-cutoff', window.paramsSeq2.cutoff);
            forceUpdateKnob('synth2-decay', window.paramsSeq2.decay);
            forceUpdateKnob('vol-seq2', window.synthVol2);
        }

        if(state.controls.s3) {
            window.paramsSeq3 = { ...state.controls.s3 };
            window.synthVol3 = state.controls.s3.vol;
            forceUpdateKnob('synth3-disto', window.paramsSeq3.disto);
            forceUpdateKnob('synth3-res', window.paramsSeq3.res);
            forceUpdateKnob('synth3-cutoff', window.paramsSeq3.cutoff);
            forceUpdateKnob('synth3-decay', window.paramsSeq3.decay);
            forceUpdateKnob('vol-seq3', window.synthVol3);
        }

        if(state.controls.kick) {
            window.kickSettings = { ...state.controls.kick };
            forceUpdateKnob('kick-pitch', window.kickSettings.pitch);
            forceUpdateKnob('kick-decay', window.kickSettings.decay);
            forceUpdateKnob('kick-level', window.kickSettings.level);
            // AJOUT DU RUMBLE ICI (VISE LE MODULE)
            if (window.kickSettings.rumble !== undefined) {
                forceUpdateKnob('kick-rumble-amount', window.kickSettings.rumble);
            }
        }

        if(state.controls.snare) {
            window.snareSettings = { ...state.controls.snare };
            forceUpdateKnob('snare-tone', window.snareSettings.tone);
            forceUpdateKnob('snare-snappy', window.snareSettings.snappy);
            forceUpdateKnob('snare-level', window.snareSettings.level);
        }
        if(state.controls.hh) {
            window.hhSettings = { ...state.controls.hh };
            forceUpdateKnob('hhc-tone', window.hhSettings.tone);
            forceUpdateKnob('hhc-level', window.hhSettings.levelClose);
            forceUpdateKnob('hho-decay', window.hhSettings.decayOpen);
            forceUpdateKnob('hho-level', window.hhSettings.levelOpen);
        }
        if(state.controls.fm) {
            window.fmSettings = { ...state.controls.fm };
            forceUpdateKnob('fm-carrier', window.fmSettings.carrierPitch);
            forceUpdateKnob('fm-mod', window.fmSettings.modPitch);
            forceUpdateKnob('fm-amt', window.fmSettings.fmAmount);
            forceUpdateKnob('fm-decay', window.fmSettings.decay);
            forceUpdateKnob('fm-level', window.fmSettings.level);
        }
    }

    window.drumSequences = state.drums.seq.map(s => [...s]);
    window.drumAccents = state.drums.acc.map(s => [...s]);
    window.synthSequences.seq2 = [...state.synths.seq2];
    window.synthSequences.seq3 = [...state.synths.seq3];
    if(state.synths.acc2) window.synthAccents.seq2 = [...state.synths.acc2];
    if(state.synths.acc3) window.synthAccents.seq3 = [...state.synths.acc3];
    
    window.freqDataSeq2 = [...state.freqs.seq2];
    window.freqDataSeq3 = [...state.freqs.seq3];
    if(state.freqs.fm) window.fmFreqData = [...state.freqs.fm];
    
    if(state.chords && state.chords.qual) window.chordQualitySeq3 = [...state.chords.qual];
    
    if(state.mutes) {
        window.trackMutes = [...state.mutes];
        document.querySelectorAll('.btn-mute').forEach((btn, i) => {
            if(i < 5) btn.classList.toggle('active', window.trackMutes[i]);
        });
    }

    if(state.solos) {
        window.trackSolos = [...state.solos];
    } else {
        window.trackSolos = [false, false, false, false, false];
    }
    document.querySelectorAll('.btn-solo').forEach((btn, i) => {
        if(i < 5) btn.classList.toggle('active', window.trackSolos[i]);
    });

    currentPageSeq1 = 0; currentPageSeq2 = 0; currentPageSeq3 = 0;
    if(document.getElementById('page-indicator-seq1')) updatePageIndicator('seq1');
    if(document.getElementById('page-indicator-seq2')) updatePageIndicator('seq2');
    if(document.getElementById('page-indicator-seq3')) updatePageIndicator('seq3');

    const stepIds = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
    stepIds.forEach((id, i) => { 
        const el = document.getElementById(id); 
        if(el && window.trackLengths[i]) el.value = window.trackLengths[i]; 
    });

    refreshGridVisuals();
    refreshFadersVisuals(2);
    if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
    if(typeof refreshFMFaders === 'function') refreshFMFaders();

    console.log(`Slot ${index + 1} Loaded.`);
}

function updateMemoryVisuals() {
    const pads = document.querySelectorAll('.mem-pad');
    pads.forEach(pad => {
        const slot = parseInt(pad.dataset.slot);
        pad.classList.remove('has-data', 'playing');
        if (window.memorySlots[slot] !== null) {
            pad.classList.add('has-data');
        }
        if (slot === window.currentMemorySlot) {
            pad.classList.add('playing');
        }
    });
}


/* ==========================================
   PRESET LOADER (VERSION ULTIME V19 - TOTAL RECALL)
   ========================================== */
window.loadPreset = function(val) {
    if (!val) return;

    const forceResetKnob = (id, val, updateFunc) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (updateFunc) updateFunc(val);
    };

    if (val === 'init') {
        if(confirm("Réinitialiser tout (Sons, Patterns, Réglages) ?")) {
            
            window.currentMemorySlot = -1;
            if(typeof updateMemoryVisuals === 'function') updateMemoryVisuals();

            window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
            window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
            window.synthSequences.seq2 = Array(64).fill(false);
            window.synthSequences.seq3 = Array(64).fill(false);
            if(window.synthAccents.seq2) window.synthAccents.seq2 = Array(64).fill(false);
            if(window.synthAccents.seq3) window.synthAccents.seq3 = Array(64).fill(false);
            
            window.freqDataSeq2.fill(440);
            window.freqDataSeq3.fill(440);
            if(window.fmFreqData) window.fmFreqData.fill(100); 
            window.chordQualitySeq3.fill(false); 
            
            window.masterLength = 16;
            window.trackLengths = [16,16,16,16,16];
            
            window.paramsSeq2 = { disto: 0, res: 5, cutoff: 4, decay: 0.2 };
            window.paramsSeq3 = { disto: 0, res: 8, cutoff: 2, decay: 0.4 };
            window.synthVol2 = 0.6;
            window.synthVol3 = 0.6;
            window.isChordModeSeq3 = false;

            document.querySelectorAll('.btn-length').forEach(b => b.classList.toggle('active', b.dataset.length == "16"));
            document.querySelectorAll('.btn-mute').forEach(b => b.classList.remove('active'));
            window.trackMutes = [false,false,false,false,false];

            const btnChord = document.getElementById('btn-chord-seq3');
            if(btnChord) {
                btnChord.innerText = "CHORD: OFF"; 
                btnChord.style.background = "transparent"; 
                btnChord.style.color = "#a855f7";
            }

            forceResetKnob('synth2-disto', 0, window.updateSynth2Disto);
            forceResetKnob('synth2-res', 5, window.updateSynth2Res);
            forceResetKnob('synth2-cutoff', 4, window.updateSynth2Cutoff);
            forceResetKnob('synth2-decay', 0.2, window.updateSynth2Decay);
            forceResetKnob('vol-seq2', 0.6, null);

            forceResetKnob('synth3-disto', 0, window.updateSynth3Disto);
            forceResetKnob('synth3-res', 8, window.updateSynth3Res);
            forceResetKnob('synth3-cutoff', 2, window.updateSynth3Cutoff);
            forceResetKnob('synth3-decay', 0.4, window.updateSynth3Decay);
            forceResetKnob('vol-seq3', 0.6, null);

            forceResetKnob('global-delay-amt', 0, window.updateDelayAmount);

            refreshGridVisuals();
            refreshFadersVisuals(2);
            if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
            if(typeof refreshFMFaders === 'function') refreshFMFaders();
        }
        document.getElementById('preset-selector').blur();
        return;
    }

    const lib = window.FACTORY_PRESETS || window.PRESETS;
    
    if (!lib || !lib[val]) {
        console.error("Preset introuvable : " + val);
        return;
    }

    window.currentMemorySlot = -1;
    if(typeof updateMemoryVisuals === 'function') updateMemoryVisuals();

    const p = lib[val];
    console.log("Loading Factory Preset:", p.name);

    if (p.drums && p.drums.seq) {
        window.drumSequences = p.drums.seq.map(seq => {
            const arr = new Array(64).fill(false);
            seq.forEach((val, i) => { if(i < 64) arr[i] = val; });
            return arr;
        });
    }
    
    if (p.drums && (p.drums.accents || p.drums.acc)) {
        const src = p.drums.accents || p.drums.acc; 
        window.drumAccents = src.map(seq => {
            const arr = new Array(64).fill(false);
            seq.forEach((val, i) => { if(i < 64) arr[i] = val; });
            return arr;
        });
    }

    if (p.drums && p.drums.fmFreqs) {
        window.fmFreqData = [...p.drums.fmFreqs];
        while(window.fmFreqData.length < 64) window.fmFreqData.push(100);
    }

    if (p.synths) {
        if (p.synths.seq2) {
            window.synthSequences.seq2 = new Array(64).fill(false);
            p.synths.seq2.forEach((val, i) => { if(i < 64) window.synthSequences.seq2[i] = val; });
        }
        if (p.synths.seq3) {
            window.synthSequences.seq3 = new Array(64).fill(false);
            p.synths.seq3.forEach((val, i) => { if(i < 64) window.synthSequences.seq3[i] = val; });
        }
        if (p.synths.acc2) window.synthAccents.seq2 = [...p.synths.acc2];
        else if (p.accents2) window.synthAccents.seq2 = [...p.accents2];

        if (p.synths.acc3) window.synthAccents.seq3 = [...p.synths.acc3];
        else if (p.accents3) window.synthAccents.seq3 = [...p.accents3]; 
    }

    if (p.freqs && Array.isArray(p.freqs.seq2)) window.freqDataSeq2 = [...p.freqs.seq2];
    else if (p.freqs2) window.freqDataSeq2 = [...p.freqs2];
    else window.freqDataSeq2.fill(440);

    if (p.freqs && Array.isArray(p.freqs.seq3)) window.freqDataSeq3 = [...p.freqs.seq3];
    else if (p.freqs3) window.freqDataSeq3 = [...p.freqs3];
    else window.freqDataSeq3.fill(440);

    if (p.chords && p.chords.qual) window.chordQualitySeq3 = [...p.chords.qual];
    else window.chordQualitySeq3.fill(false);


    if (p.bpm) document.getElementById('display-bpm1').innerText = p.bpm;
    
    if (p.swing !== undefined) {
        globalSwing = p.swing / 100;
        document.getElementById('global-swing').value = p.swing;
    }

    if (p.masterLength) {
        window.masterLength = p.masterLength;
        document.querySelectorAll('.btn-length').forEach(btn => {
            const val = parseInt(btn.dataset.length);
            btn.classList.toggle('active', val === window.masterLength);
        });
    }
    
    if (p.trackLengths) window.trackLengths = [...p.trackLengths];


    if (p.controls) {
        window.isChordModeSeq3 = p.controls.isChordMode;
        const btnChord = document.getElementById('btn-chord-seq3');
        if (btnChord) {
            if(window.isChordModeSeq3) {
                 btnChord.innerText = "CHORD: ON"; btnChord.style.background = "#a855f7"; btnChord.style.color = "#000";
            } else {
                 btnChord.innerText = "CHORD: OFF"; btnChord.style.background = "transparent"; btnChord.style.color = "#a855f7";
            }
        }

        if(p.controls.s2) {
            window.paramsSeq2 = { ...p.controls.s2 };
            window.synthVol2 = p.controls.s2.vol;
            forceResetKnob('synth2-disto', window.paramsSeq2.disto, window.updateSynth2Disto);
            forceResetKnob('synth2-res', window.paramsSeq2.res, window.updateSynth2Res);
            forceResetKnob('synth2-cutoff', window.paramsSeq2.cutoff, window.updateSynth2Cutoff);
            forceResetKnob('synth2-decay', window.paramsSeq2.decay, window.updateSynth2Decay);
            forceResetKnob('vol-seq2', window.synthVol2, null);
        }
        if(p.controls.s3) {
            window.paramsSeq3 = { ...p.controls.s3 };
            window.synthVol3 = p.controls.s3.vol;
            forceResetKnob('synth3-disto', window.paramsSeq3.disto, window.updateSynth3Disto);
            forceResetKnob('synth3-res', window.paramsSeq3.res, window.updateSynth3Res);
            forceResetKnob('synth3-cutoff', window.paramsSeq3.cutoff, window.updateSynth3Cutoff);
            forceResetKnob('synth3-decay', window.paramsSeq3.decay, window.updateSynth3Decay);
            forceResetKnob('vol-seq3', window.synthVol3, null);
        }
        if(p.controls.delay !== undefined) forceResetKnob('global-delay-amt', p.controls.delay, window.updateDelayAmount);

        if(p.controls.kick) {
            window.kickSettings = { ...p.controls.kick };
            forceResetKnob('kick-pitch', window.kickSettings.pitch);
            forceResetKnob('kick-decay', window.kickSettings.decay);
            forceResetKnob('kick-level', window.kickSettings.level);
        }
        if(p.controls.snare) {
            window.snareSettings = { ...p.controls.snare };
            forceResetKnob('snare-tone', window.snareSettings.tone);
            forceResetKnob('snare-snappy', window.snareSettings.snappy);
            forceResetKnob('snare-level', window.snareSettings.level);
        }
        if(p.controls.hh) {
            window.hhSettings = { ...p.controls.hh };
            forceResetKnob('hhc-tone', window.hhSettings.tone);
            forceResetKnob('hhc-level', window.hhSettings.levelClose);
            forceResetKnob('hho-decay', window.hhSettings.decayOpen);
            forceResetKnob('hho-level', window.hhSettings.levelOpen);
        }
        if(p.controls.fm) {
            window.fmSettings = { ...p.controls.fm };
            forceResetKnob('fm-carrier', window.fmSettings.carrierPitch);
            forceResetKnob('fm-mod', window.fmSettings.modPitch);
            forceResetKnob('fm-amt', window.fmSettings.fmAmount);
            forceResetKnob('fm-decay', window.fmSettings.decay);
            forceResetKnob('fm-level', window.fmSettings.level);
        }
    }

    currentPageSeq1 = 0; currentPageSeq2 = 0; currentPageSeq3 = 0;
    
    if(document.getElementById('page-indicator-seq1')) updatePageIndicator('seq1');
    if(document.getElementById('page-indicator-seq2')) updatePageIndicator('seq2');
    if(document.getElementById('page-indicator-seq3')) updatePageIndicator('seq3');

    const ids = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
    ids.forEach((id, i) => { 
        const el = document.getElementById(id); 
        if(el && window.trackLengths[i]) el.value = window.trackLengths[i]; 
    });

    refreshGridVisuals();
    refreshFadersVisuals(2);
    if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
    if(typeof refreshFMFaders === 'function') refreshFMFaders();
    
    document.getElementById('preset-selector').blur();
};

const btnExport = document.getElementById('btn-export-file');
const btnImport = document.getElementById('btn-import-file');
const fileInput = document.getElementById('file-upload');

if (btnExport) {
    btnExport.addEventListener('click', () => {
        if (IO && IO.exportPreset) IO.exportPreset();
    });
}

if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
        fileInput.click(); 
    });

    fileInput.addEventListener('change', (e) => {
        if (IO && IO.importPreset) IO.importPreset(e);
    });
}
