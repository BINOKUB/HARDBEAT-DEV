/* ==========================================
   HARDBEAT PRO - UI LOGIC (V14 - FM HZ SUPPORT)
   ========================================== */

let masterTimer; 
let isMetroOn = false; 
let globalSwing = 0.06;

// --- VARIABLES GLOBALES ---
window.masterLength = 16;       
window.isSaveMode = false;

// Mémoire
window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
window.synthSequences = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };


// NOUVEAU : Mémoire pour les accents Synthés (Invisibles mais audibles)
window.synthAccents = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };
// ... Sous window.synthAccents ...
window.fmFreqData = Array(64).fill(100); // 100Hz par défaut

window.freqDataSeq2 = Array(64).fill(440);
window.freqDataSeq3 = Array(64).fill(440);

window.trackLengths = [16, 16, 16, 16, 16]; 
window.trackMutes = [false, false, false, false, false];
window.trackSolos = [false, false, false, false, false];
let trackCursors = [0, 0, 0, 0, 0]; 

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

function setupLengthControls() {
    const btns = document.querySelectorAll('.btn-length');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. GESTION VISUELLE DES BOUTONS
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 2. MISE A JOUR DU MASTER
            const newLength = parseInt(btn.dataset.length);
            window.masterLength = newLength;

            // --- DEBUT DU CORRECTIF ---
            
            // 3. AUTO-SYNC : On aligne les pistes de batterie sur la nouvelle longueur
            // C'est ça qui "débloque" l'accès aux pages 17-32 pour le moteur audio
            for(let i=0; i<5; i++) {
                // On met à jour la longueur logique de la piste
                window.trackLengths[i] = newLength;
                
                // Sécurité : Si le curseur était trop loin, on le ramène à 0 pour éviter un bug
                if (trackCursors[i] >= newLength) trackCursors[i] = 0;
            }

            // 4. MISE A JOUR VISUELLE DES SLIDERS (KICK-STEPS, SNARE-STEPS...)
            // Pour que l'interface montre bien "32" ou "64" et pas "16"
            const inputs = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if(el) {
                    el.value = newLength; // Le slider se déplace visuellement
                    // Petite astuce : on augmente le max si besoin pour pas bloquer le slider
                    if(parseInt(el.max) < newLength) el.max = newLength; 
                }
            });

            // --- FIN DU CORRECTIF ---

            // 5. GESTION DES PAGES (Si on réduit la taille, on revient page 1)
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

function bindControls() {
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    
    // Track Steps Sliders
    const bindSteps = (id, trackIdx) => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = (e) => {
                window.trackLengths[trackIdx] = parseInt(e.target.value);
                if (trackCursors[trackIdx] >= window.trackLengths[trackIdx]) trackCursors[trackIdx] = 0;
                if (currentTrackIndex === trackIdx) refreshGridVisuals();
            };
        }
    };
    bindSteps('kick-steps', 0); bindSteps('snare-steps', 1); bindSteps('hhc-steps', 2); bindSteps('hho-steps', 3); bindSteps('fm-steps', 4);

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
            case 4: if (p > 0.7) window.drumSequences[trackIdx][i] = true; break;
        }
    }
}

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

        // FORCE INIT FADERS & DATA
        const initialFaders3 = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
        initialFaders3.forEach((f, i) => { window.freqDataSeq3[i] = parseFloat(f.value); });

        document.getElementById('vol-seq3').oninput = (e) => window.synthVol3 = parseFloat(e.target.value);
        document.getElementById('synth3-disto').oninput = (e) => { if(window.updateSynth3Disto) window.updateSynth3Disto(parseFloat(e.target.value)); };
        document.getElementById('synth3-res').oninput = (e) => { if(window.updateSynth3Res) window.updateSynth3Res(parseFloat(e.target.value)); };
        document.getElementById('synth3-cutoff').oninput = (e) => { if(window.updateSynth3Cutoff) window.updateSynth3Cutoff(parseFloat(e.target.value)); };
        document.getElementById('synth3-decay').oninput = (e) => { if(window.updateSynth3Decay) window.updateSynth3Decay(parseFloat(e.target.value)); };
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
        
        refreshGridVisuals();
        refreshFadersVisuals(3);
    });
}

function initAudioPreview() {
    console.log("Audio Preview V4: Active.");

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


// --- GESTION DES FADERS FM (CONTEXTUEL) ---
function initFMExtension() {
    // 1. Création du container HTML
    const grid1 = document.getElementById('grid-seq1');
    if(!grid1) return;
    
    const fmContainer = document.createElement('div');
    fmContainer.id = 'fm-faders-container';
    
    let html = '';
    for(let i=0; i<16; i++) {
        html += `
        <div class="fm-fader-unit">
            <span class="fm-hz-label">100</span>
            <input type="range" class="fm-freq-fader" data-index="${i}" min="40" max="400" value="100" step="1">
        </div>`;
    }
    fmContainer.innerHTML = html;

    // --- CORRECTION DU PLACEMENT ---
    // On l'ajoute à la fin de la section (sous la grille et le slider accent)
    const section = grid1.closest('.rack-section');
    section.appendChild(fmContainer); 
    // -------------------------------

    // 2. Ecouteurs d'événements
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

// Fonction pour rafraîchir les valeurs des faders FM (Pagination)
function refreshFMFaders() {
    const container = document.getElementById('fm-faders-container');
    if(!container) return;
    
    // On n'affiche le container QUE si on est sur la piste 4 (FM)
    if(currentTrackIndex === 4) {
        container.classList.add('visible');
    } else {
        container.classList.remove('visible');
        return; // Pas besoin de calculer si caché
    }

    const faders = container.querySelectorAll('.fm-freq-fader');
    const offset = currentPageSeq1 * 16; // Utilise la pagination batterie

    faders.forEach((f, i) => {
        const realIndex = i + offset;
        f.dataset.realIndex = realIndex; // Lien avec la mémoire 64 pas
        
        // Récupération valeur ou défaut 100Hz
        const val = window.fmFreqData[realIndex] || 100;
        f.value = val;
        
        const label = f.previousElementSibling;
        if(label) label.innerText = val;
        
        // Désactiver si hors longueur master
        if(realIndex >= window.masterLength) {
            f.disabled = true;
            f.style.opacity = "0.2";
        } else {
            f.disabled = false;
            f.style.opacity = "1";
        }
    });
}


/* ==========================================
   MAIN INIT 
   ========================================== */
window.addEventListener('load', () => {
    console.log("Initialisation Logic V12 (Final)...");
    
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
    
    if(typeof initStorageSystem === 'function') initStorageSystem();
    
    refreshGridVisuals();
    refreshFadersVisuals(2);

    const playBtn = document.getElementById('master-play-stop');
    if (playBtn) playBtn.onclick = () => togglePlay(playBtn);
   
    if(typeof initFreqSnapshots === 'function') initFreqSnapshots();
    
    setTimeout(initAudioPreview, 800);

    console.log("Logic V12 : Prêt.");
});

// --- PLAYBACK ENGINE ---

function togglePlay(btn) {
    if (!window.audioCtx) return;

    if (window.isPlaying) {
        window.isPlaying = false; 
        clearTimeout(masterTimer); 
        btn.innerText = "PLAY / STOP";
        btn.style.background = "#222"; 
        btn.style.color = "#fff";
        globalTickCount = 0;
        globalMasterStep = 0;
        trackCursors = [0, 0, 0, 0, 0]; 
        currentSynthStep = 0;
        refreshGridVisuals(); 
    } else {
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        window.isPlaying = true; 
        btn.innerText = "STOP";
        btn.style.background = "#00f3ff"; 
        btn.style.color = "#000";
        trackCursors = [0, 0, 0, 0, 0];
        globalMasterStep = 0;
        globalTickCount = 0;
        currentSynthStep = 0;
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
        
        // CHECK ACCENT MEMORY
        let isAccent2 = false;
        if(window.synthAccents && window.synthAccents.seq2) {
            isAccent2 = window.synthAccents.seq2[masterStep];
        }

        if(window.freqDataSeq2) window.playSynthStep(masterStep, window.freqDataSeq2[masterStep], 2, isActive2, isAccent2);

        const isActive3 = window.synthSequences.seq3[masterStep];
        
        // CHECK ACCENT MEMORY 3
        let isAccent3 = false;
        if(window.synthAccents && window.synthAccents.seq3) {
            isAccent3 = window.synthAccents.seq3[masterStep];
        }

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

// --- SNAPSHOTS (MEMORY) ---
function initFreqSnapshots() {
    window.freqSnapshots = [null, null, null, null]; 
    let isSnapshotSaveMode = false;
    const btnSave = document.getElementById('btn-snap-save');
    const slots = document.querySelectorAll('.btn-snap-slot');
    if(!btnSave) return;
    btnSave.onclick = () => { isSnapshotSaveMode = !isSnapshotSaveMode; btnSave.classList.toggle('saving', isSnapshotSaveMode); };
    slots.forEach(slotBtn => {
        slotBtn.onclick = () => {
            const slotIndex = parseInt(slotBtn.dataset.slot);
            if (isSnapshotSaveMode) {
                window.freqSnapshots[slotIndex] = [...window.freqDataSeq2];
                slotBtn.classList.add('has-data');
                isSnapshotSaveMode = false;
                btnSave.classList.remove('saving');
                slotBtn.classList.add('flash-load');
                setTimeout(() => slotBtn.classList.remove('flash-load'), 200);
            } else {
                if (window.freqSnapshots[slotIndex]) {
                    window.freqDataSeq2 = [...window.freqSnapshots[slotIndex]];
                    refreshFadersVisuals(2);
                    slotBtn.classList.add('flash-load');
                    setTimeout(() => slotBtn.classList.remove('flash-load'), 200);
                }
            }
        };
    });
}

/* ==========================================
   PRESET LOADER (A ajouter à la fin de logic.js)
   ========================================== */

window.loadPreset = function(presetKey) {
    // 1. On vérifie si le preset existe
    if (!window.presets || !window.presets[presetKey]) {
        console.error("Preset introuvable ou presets.js non chargé.");
        return;
    }

    const p = window.presets[presetKey];
    console.log("Loading Preset:", p.name);

    // 2. CHARGEMENT BASIQUE
    if(document.getElementById('display-bpm1')) document.getElementById('display-bpm1').innerText = p.bpm;
    window.masterLength = p.masterLength || 16;
    window.trackLengths = p.trackLengths || [16, 16, 16, 16, 16]; 

    // 3. DRUMS & ACCENTS (DRUMS)
    // On copie les données pour ne pas modifier le preset original en mémoire
    window.drumSequences = p.drums.seq.map(s => [...s]); 
    // Si le preset a des accents drums, on les charge, sinon on met du vide
    window.drumAccents = p.drums.accents ? p.drums.accents.map(s => [...s]) : Array.from({length:5}, () => Array(64).fill(false));

    // 4. SYNTHS (NOTES & FRÉQUENCES)
    window.synthSequences.seq2 = [...p.synths.seq2];
    window.synthSequences.seq3 = [...p.synths.seq3];
    
    window.freqDataSeq2 = p.freqs2 ? [...p.freqs2] : Array(64).fill(440);
    window.freqDataSeq3 = p.freqs3 ? [...p.freqs3] : Array(64).fill(440);

    // 5. SYNTHS (ACCENTS - NOUVEAU V5)
    // C'est ici qu'on gère la compatibilité.
    
    // Pour Seq 2
    if (p.accents2) {
        window.synthAccents.seq2 = [...p.accents2];
    } else {
        // Si c'est un vieux preset, on efface les accents précédents pour ne pas avoir de "fantômes"
        window.synthAccents.seq2 = Array(64).fill(false);
    }

    // Pour Seq 3
    if (p.accents3) {
        window.synthAccents.seq3 = [...p.accents3];
    } else {
        window.synthAccents.seq3 = Array(64).fill(false);
    }

    // 6. ACTUALISATION DE L'INTERFACE
    // On met à jour les Sliders de longueur (Polyrythmie)
    const inputs = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
    inputs.forEach((id, i) => {
        const el = document.getElementById(id);
        if(el) el.value = window.trackLengths[i];
    });

    // On rafraîchit la grille visuelle
    if (typeof refreshGridVisuals === 'function') refreshGridVisuals();
    
    // On rafraîchit les faders de fréquences
    if (typeof refreshFadersVisuals === 'function') {
        refreshFadersVisuals(2);
        // On ne rafraîchit le 3 que si l'extension est ouverte, pour éviter les erreurs
        if(document.getElementById('grid-freq-seq3')) refreshFadersVisuals(3);
    }
    
    console.log("Preset chargé avec succès !");
};
