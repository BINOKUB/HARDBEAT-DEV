/* ==========================================
   HARDBEAT PRO - UI LOGIC (V8 - POLYRHYTHMIE REELLE & VISUEL)
   ========================================== */

let masterTimer; // UNE SEULE HORLOGE pour tout le système
let isMetroOn = false; 
let globalSwing = 0.06;

// --- VARIABLES GLOBALES ---
window.masterLength = 16;      
window.isSaveMode = false;

// Mémoire
window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
window.synthSequences = { seq2: Array(64).fill(false), seq3: Array(64).fill(false) };
window.freqDataSeq2 = Array(64).fill(440);
window.freqDataSeq3 = Array(64).fill(440);

window.trackLengths = [16, 16, 16, 16, 16]; 
window.trackMutes = [false, false, false, false, false];
window.trackSolos = [false, false, false, false, false];

// --- NOUVEAU : COMPTEURS INDÉPENDANTS (Pour que le Kick boucle sur 3 pendant que le Snare boucle sur 16) ---
let trackCursors = [0, 0, 0, 0, 0]; 

// Internes
let currentPageSeq1 = 0;    
let currentPageSeq2 = 0;    
let currentPageSeq3 = 0; 
let currentTrackIndex = 0;

// Compteurs Globaux
let globalTickCount = 0; 
let globalMasterStep = 0; // Position absolue (0 à 63)

// --- INIT ---
window.addEventListener('load', () => {
    console.log("Initialisation Logic V8 (FR)...");
    
    if (!window.audioCtx) console.error("ERREUR : audio.js manquant !");

    initGrid('grid-seq1'); 
    initGrid('grid-seq2'); 
    initFaders('grid-freq-seq2', 2);
    
    // Initialisation forcée des faders
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
   
    initFreqSnapshots();
    console.log("Logic V8 : Prêt.");
});

function togglePlay(btn) {
    if (!window.audioCtx) return;

    if (window.isPlaying) {
        // STOP
        window.isPlaying = false; 
        clearTimeout(masterTimer); 
        btn.innerText = "PLAY / STOP";
        btn.style.background = "#222"; 
        btn.style.color = "#fff";
        
        // RESET TOTAL
        globalTickCount = 0;
        globalMasterStep = 0;
        trackCursors = [0, 0, 0, 0, 0]; // On remet tous les instruments au début
        currentSynthStep = 0;
        
        refreshGridVisuals(); 
        
    } else {
        // PLAY
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        window.isPlaying = true; 
        btn.innerText = "STOP";
        btn.style.background = "#00f3ff"; 
        btn.style.color = "#000";
        
        // On repart à zéro
        trackCursors = [0, 0, 0, 0, 0];
        globalMasterStep = 0;
        globalTickCount = 0;
        currentSynthStep = 0;
        
        runMasterClock(); 
    }
}

// --- MOTEUR D'HORLOGE MAÎTRE (Le Cœur) ---

function runMasterClock() {
    if (!window.isPlaying) return;

    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const bpm2Display = document.getElementById('display-bpm2');
    if(bpm2Display && bpm2Display.innerText != bpm) bpm2Display.innerText = bpm;

    let baseDuration = (60 / bpm) / 4 * 1000;
    let currentStepDuration = (globalTickCount % 2 === 0) ? baseDuration * (1 + globalSwing) : baseDuration * (1 - globalSwing);

    // 1. JOUER LE SON
    triggerDrums();
    triggerSynths(globalMasterStep);

    // 2. METTRE À JOUR L'ÉCRAN
    updatePlayheads();

    // 3. AVANCER LES COMPTEURS
    // Chaque piste avance selon SA PROPRE longueur (Polyrythmie)
    for(let i=0; i<5; i++) {
        trackCursors[i] = (trackCursors[i] + 1) % window.trackLengths[i];
    }
    
    // Le compteur général avance selon la longueur MAÎTRE (64)
    globalMasterStep = (globalMasterStep + 1) % window.masterLength;
    globalTickCount++;

    masterTimer = setTimeout(runMasterClock, currentStepDuration);
}

function triggerDrums() {
    const isAnySolo = window.trackSolos.includes(true);
    
    for (let i = 0; i < 5; i++) {
        // On utilise le curseur INDÉPENDANT de la piste
        let pos = trackCursors[i]; 

        let shouldPlay = true;
        if (isAnySolo) { if (!window.trackSolos[i]) shouldPlay = false; } else { if (window.trackMutes[i]) shouldPlay = false; }

        if (shouldPlay && window.drumSequences[i][pos]) {
            let acc = window.drumAccents[i][pos];
            if(i===0 && window.playKick) window.playKick(acc);
            if(i===1 && window.playSnare) window.playSnare(acc);
            if(i===2 && window.playHiHat) window.playHiHat(false, acc);
            if(i===3 && window.playHiHat) window.playHiHat(true, acc);
            if(i===4 && window.playDrumFM) window.playDrumFM(acc);
        }
        
        // Métronome (reste stable sur le temps absolu)
        if (i === 0 && isMetroOn && globalTickCount % 4 === 0) { 
            if(window.playMetronome) window.playMetronome(globalTickCount % 16 === 0); 
        }
    }
}

// Les Synthés restent synchronisés sur le Maître (Comportement standard DAW)
let currentSynthStep = 0;
function triggerSynths(masterStep) {
    if(window.playSynthStep) {
        const isActive2 = window.synthSequences.seq2[masterStep];
        if(window.freqDataSeq2) window.playSynthStep(masterStep, window.freqDataSeq2[masterStep], 2, isActive2);

        const isActive3 = window.synthSequences.seq3[masterStep];
        if(window.freqDataSeq3) window.playSynthStep(masterStep, window.freqDataSeq3[masterStep], 3, isActive3);
    }
}

function updatePlayheads() {
    // DRUMS (SEQ 1)
    const pads1 = document.querySelectorAll('#grid-seq1 .step-pad');
    const offset1 = currentPageSeq1 * 16;
    
    // On affiche le curseur de l'instrument SÉLECTIONNÉ
    const activeCursor = trackCursors[currentTrackIndex];
    
    // Pour l'affichage, on doit "tricher" un peu :
    // Si l'instrument boucle sur 3 pas (0, 1, 2), on veut voir s'allumer les pads 1, 2, 3.
    // Mais si on est sur la page 2 (pas 17-32), on ne voit rien, c'est normal.
    // SAUF si on veut voir le curseur "passer" sur la page 2 ?
    // Pour l'instant, restons simple : on allume le pad correspondant à la position de lecture.
    
    pads1.forEach((p, index) => {
        const realIndex = index + offset1; // L'index réel du bouton (ex: 17)
        p.style.borderColor = "#333"; // Reset
        
        // Si le curseur de lecture est sur ce pad précis
        // (Attention : si la boucle fait 3 pas, le curseur vaudra 0, 1, 2. Donc seuls les pads 1, 2, 3 s'allumeront)
        if (realIndex === activeCursor) {
            p.style.borderColor = "#ffffff";
        }
    });

    // SYNTHS
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
            } else {
                padsS.forEach(p => p.style.borderColor = "#333");
            }
        }
    });
}

// --- VISUEL ET FEEDBACK ---
window.refreshGridVisuals = function() {
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    const accents = document.querySelectorAll('#grid-seq1 .accent-pad');
    if(pads.length === 0) return;
    const offset1 = currentPageSeq1 * 16;

    // Récupère la longueur de la boucle de l'instrument actuel
    const currentTrackLen = window.trackLengths[currentTrackIndex]; 

    pads.forEach((pad, i) => {
        const realIndex = i + offset1; 
        
        // 1. Si on dépasse le MASTER (64), on désactive complètement (gris foncé, inerte)
        if (realIndex >= window.masterLength) {
            pad.classList.add('disabled'); 
            pad.style.opacity = "0.2";
        } else {
            pad.classList.remove('disabled');
            
            // 2. Si on dépasse la BOUCLE INSTRUMENT (Slider), on atténue mais on laisse visible
            if (realIndex >= currentTrackLen) {
                pad.style.opacity = "0.3"; // "Fantôme"
            } else {
                pad.style.opacity = "1"; // Actif
            }
        }
        
        if(window.drumSequences && window.drumSequences[currentTrackIndex]) { 
            const isActive = window.drumSequences[currentTrackIndex][realIndex]; 
            pad.classList.toggle('active', isActive); 
            
            const led = pad.querySelector('.led'); 
            // Si hors boucle, la LED est éteinte même si la note est active (elle ne jouera pas)
            if (realIndex >= currentTrackLen) {
                if(led) led.style.background = "#111"; 
            } else {
                if (led) led.style.background = isActive ? "red" : "#330000"; 
            }
            
            pad.dataset.realIndex = realIndex; 
        }
        const span = pad.querySelector('span');
        if(span) span.innerText = realIndex + 1;
    });

    accents.forEach((acc, i) => {
        const realIndex = i + offset1;
        acc.dataset.realIndex = realIndex; 
        
        if (realIndex >= window.masterLength) { 
            acc.style.opacity = "0.1"; acc.style.pointerEvents = "none"; 
        } else { 
            if (realIndex >= currentTrackLen) acc.style.opacity = "0.2";
            else acc.style.opacity = "1";
            acc.style.pointerEvents = "auto"; 
        }
        
        if(window.drumAccents && window.drumAccents[currentTrackIndex]) { 
            acc.classList.toggle('active', window.drumAccents[currentTrackIndex][realIndex]); 
        }
    });
    
    // Synths Refresh
    const updateSynthGrid = (seqKey, seqNum, page) => {
        const padsS = document.querySelectorAll(`#grid-seq${seqNum} .step-pad`);
        const offsetS = page * 16;
        const color = (seqNum === 2) ? "cyan" : "#a855f7";
        if (padsS.length > 0) padsS.forEach((pad, i) => { 
            const realIndex = i + offsetS;
            pad.dataset.realIndex = realIndex;
            
            if (realIndex >= window.masterLength) {
                pad.classList.add('disabled'); 
                pad.style.opacity = "0.2";
            } else {
                pad.classList.remove('disabled');
                pad.style.opacity = "1";
            }

            const isActive = window.synthSequences[seqKey][realIndex]; 
            pad.classList.toggle('active', isActive); 
            const led = pad.querySelector('.led'); 
            if (led) led.style.background = isActive ? color : "#330000"; 
        });
    };
    
    updateSynthGrid('seq2', 2, currentPageSeq2);
    if(window.synthSequences.seq3) updateSynthGrid('seq3', 3, currentPageSeq3);
};

window.refreshFadersVisuals = function(seqId) {
    const containerId = (seqId === 3) ? 'grid-freq-seq3' : 'grid-freq-seq2';
    const faders = document.querySelectorAll(`#${containerId} .freq-fader`);
    const data = (seqId === 3) ? window.freqDataSeq3 : window.freqDataSeq2;
    const page = (seqId === 3) ? currentPageSeq3 : currentPageSeq2;
    const offset = page * 16;
    faders.forEach((fader, i) => {
        const realIndex = i + offset;
        fader.dataset.realIndex = realIndex; 
        const val = data[realIndex] || 440;
        fader.value = val; 
        if(fader.previousElementSibling) fader.previousElementSibling.innerText = val + "Hz";
    });
};

// --- CONTROLS ---
function bindControls() {
    const bind = (id, obj, prop) => { const el = document.getElementById(id); if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value); };
    
    // BINDING SPÉCIAL POUR LES SLIDERS DE BOUCLE (Visual Feedback Immédiat)
    const bindSteps = (id, trackIdx) => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = (e) => {
                window.trackLengths[trackIdx] = parseInt(e.target.value);
                // Si on raccourcit la boucle, on ramène le curseur à 0 pour éviter le silence
                if (trackCursors[trackIdx] >= window.trackLengths[trackIdx]) {
                    trackCursors[trackIdx] = 0;
                }
                // Mise à jour visuelle immédiate
                if (currentTrackIndex === trackIdx) refreshGridVisuals();
            };
        }
    };

    bindSteps('kick-steps', 0);
    bindSteps('snare-steps', 1);
    bindSteps('hhc-steps', 2);
    bindSteps('hho-steps', 3);
    bindSteps('fm-steps', 4);

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

function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

function setupTempoDrag(id) {
    const el = document.getElementById(id); if(!el) return;
    let isDragging = false, startY = 0, startVal = 0; el.style.cursor = "ns-resize";
    el.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startVal = parseInt(el.innerText); document.body.style.cursor = "ns-resize"; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (!isDragging) return; let newVal = startVal + Math.floor((startY - e.clientY) / 2); if (newVal < 40) newVal = 40; if (newVal > 300) newVal = 300; el.innerText = newVal; });
    window.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = "default"; });
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

        const initialFaders3 = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
        initialFaders3.forEach((f, i) => { window.freqDataSeq3[i] = parseFloat(f.value); });

        document.getElementById('vol-seq3').oninput = (e) => window.synthVol3 = parseFloat(e.target.value);
        document.getElementById('synth3-disto').oninput = (e) => { if(window.updateSynth3Disto) window.updateSynth3Disto(parseFloat(e.target.value)); };
        document.getElementById('synth3-res').oninput = (e) => { if(window.updateSynth3Res) window.updateSynth3Res(parseFloat(e.target.value)); };
        document.getElementById('synth3-cutoff').oninput = (e) => { if(window.updateSynth3Cutoff) window.updateSynth3Cutoff(parseFloat(e.target.value)); };
        document.getElementById('synth3-decay').oninput = (e) => { if(window.updateSynth3Decay) window.updateSynth3Decay(parseFloat(e.target.value)); };
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// --- SETUP NAV ---
function setupLengthControls() {
    const btns = document.querySelectorAll('.btn-length');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.masterLength = parseInt(btn.dataset.length);
            
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

// LISTENERS
document.addEventListener('mousedown', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        if (pad.classList.contains('disabled')) return;
        const idx = parseInt(pad.dataset.realIndex); 
        const pid = pad.closest('.step-grid').id;
        
        if (pid === 'grid-seq1') { 
            window.drumSequences[currentTrackIndex][idx] = !window.drumSequences[currentTrackIndex][idx]; 
            // Refresh complet pour gérer l'état LED vs Opacité
            refreshGridVisuals();
        } 
        else if (pid === 'grid-seq2') { 
            window.synthSequences.seq2[idx] = !window.synthSequences.seq2[idx]; 
            pad.classList.toggle('active'); 
            const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq2[idx] ? "cyan" : "#330000"; 
        } 
        else if (pid === 'grid-seq3') { 
            window.synthSequences.seq3[idx] = !window.synthSequences.seq3[idx]; 
            pad.classList.toggle('active'); 
            const led = pad.querySelector('.led'); if(led) led.style.background = window.synthSequences.seq3[idx] ? "#a855f7" : "#330000"; 
        }
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
    if (e.target.classList.contains('btn-drum-rand')) {
        const track = parseInt(e.target.dataset.track);
        generateSmartRhythm(track);
        refreshGridVisuals();
        return;
    }
    if (e.target.classList.contains('track-btn')) { 
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active')); 
        e.target.classList.add('active'); 
        currentTrackIndex = parseInt(e.target.dataset.track); 
        showParamsForTrack(currentTrackIndex); 
        refreshGridVisuals(); 
    }
    if (e.target.classList.contains('btn-mute') && !e.target.classList.contains('btn-synth-mute')) { const track = parseInt(e.target.dataset.track); window.trackMutes[track] = !window.trackMutes[track]; e.target.classList.toggle('active', window.trackMutes[track]); if(window.trackMutes[track]) { window.trackSolos[track] = false; const soloBtn = e.target.parentElement.querySelector('.btn-solo'); if(soloBtn) soloBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-solo')) { const track = parseInt(e.target.dataset.track); window.trackSolos[track] = !window.trackSolos[track]; e.target.classList.toggle('active', window.trackSolos[track]); if(window.trackSolos[track]) { window.trackMutes[track] = false; const muteBtn = e.target.parentElement.querySelector('.btn-mute'); if(muteBtn) muteBtn.classList.remove('active'); } return; }
    if (e.target.classList.contains('btn-synth-mute')) { const target = parseInt(e.target.dataset.target); if(window.toggleMuteSynth) window.toggleMuteSynth(target, !e.target.classList.contains('active')); e.target.classList.toggle('active'); return; }
    if (e.target.classList.contains('btn-random')) { const target = parseInt(e.target.dataset.target); const selector = (target === 3) ? '#grid-freq-seq3 .freq-fader' : '#grid-freq-seq2 .freq-fader'; const faders = document.querySelectorAll(selector); const btn = e.target; btn.style.background = (target === 3) ? "#a855f7" : "#00f3ff"; btn.style.color = "#000"; setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100); faders.forEach(fader => { const randomFreq = Math.floor(Math.random() * (880 - 50) + 50); fader.value = randomFreq; fader.dispatchEvent(new Event('input', { bubbles: true })); }); return; }
});

// --- SYSTEME DE SNAPSHOTS FREQUENCES ---
function initFreqSnapshots() {
    window.freqSnapshots = [null, null, null, null]; // 4 mémoires vides
    let isSnapshotSaveMode = false;

    const btnSave = document.getElementById('btn-snap-save');
    const slots = document.querySelectorAll('.btn-snap-slot');

    if(!btnSave) return;

    // Click sur "S" (Save)
    btnSave.onclick = () => {
        isSnapshotSaveMode = !isSnapshotSaveMode;
        btnSave.classList.toggle('saving', isSnapshotSaveMode);
    };

    // Click sur un Slot 1-4
    slots.forEach(slotBtn => {
        slotBtn.onclick = () => {
            const slotIndex = parseInt(slotBtn.dataset.slot);

            if (isSnapshotSaveMode) {
                // SAUVEGARDE
                // On clone le tableau actuel pour figer les valeurs
                window.freqSnapshots[slotIndex] = [...window.freqDataSeq2];
                
                slotBtn.classList.add('has-data');
                
                // Feedback visuel et sortie du mode save
                isSnapshotSaveMode = false;
                btnSave.classList.remove('saving');
                slotBtn.classList.add('flash-load');
                setTimeout(() => slotBtn.classList.remove('flash-load'), 200);
                
            } else {
                // CHARGEMENT (RAPPEL)
                if (window.freqSnapshots[slotIndex]) {
                    // On remplace les fréquences actuelles par celles de la mémoire
                    window.freqDataSeq2 = [...window.freqSnapshots[slotIndex]];
                    
                    // On met à jour les faders visuels
                    refreshFadersVisuals(2);
                    
                    slotBtn.classList.add('flash-load');
                    setTimeout(() => slotBtn.classList.remove('flash-load'), 200);
                }
            }
        };
    });
}

/* ==========================================
   MODULE D'AUDITION (PREVIEW)
   Joue une note quand on touche les faders ou les pads
   ========================================== */

/* ==========================================
   MODULE D'AUDITION (PREVIEW GLOBAL V2)
   Fonctionne même pour les instruments créés après coup (Seq 3)
   ========================================== */

function initAudioPreview() {
    console.log("Audio Preview: Global Mode Active.");

    // 1. ECOUTEUR GLOBAL POUR LES FADERS (Input)
    // Détecte n'importe quel mouvement de fader 'freq-fader' sur la page
    document.addEventListener('input', (e) => {
        // On vérifie si l'élément touché est un fader de fréquence
        if(e.target.classList.contains('freq-fader')) {
            const freq = parseFloat(e.target.value);
            
            // On cherche à quel Synth il appartient (en regardant le parent)
            const section = e.target.closest('.rack-section');
            if(section) {
                // On lit l'ID de la section (2 ou 3)
                const seqId = parseInt(section.dataset.id);
                
                // On joue le son (Si c'est Seq 2 ou 3)
                if((seqId === 2 || seqId === 3) && window.playSynthSound) {
                    window.playSynthSound(seqId, freq, 0.1, 0, 0); 
                }
            }
        }
    });

    // 2. ECOUTEUR GLOBAL POUR LES PADS (Click)
    document.addEventListener('click', (e) => {
        // On vérifie si on a cliqué sur un Pad
        const pad = e.target.closest('.step-pad');
        
        // Si c'est un pad et qu'il est ACTIF (allumé)
        if(pad && pad.classList.contains('active')) {
            const section = pad.closest('.rack-section');
            if(section) {
                const seqId = parseInt(section.dataset.id);

                // On s'intéresse uniquement aux Synths (2 et 3), pas au Drum (0 ou 1)
                if(seqId === 2 || seqId === 3) {
                    
                    // Calcul savant pour trouver l'index du pad (0 à 63)
                    // On trouve la colonne parente, puis sa position dans la grille
                    const col = pad.closest('.step-column');
                    const grid = col.parentElement;
                    const index = Array.from(grid.children).indexOf(col);
                    
                    // On récupère la bonne fréquence en mémoire
                    let freq = 440;
                    if(seqId === 2 && window.freqDataSeq2) freq = window.freqDataSeq2[index];
                    if(seqId === 3 && window.freqDataSeq3) freq = window.freqDataSeq3[index];

                    // Jouer !
                    if(window.playSynthSound && freq) {
                        window.playSynthSound(seqId, freq, 0.15, 0, 0);
                    }
                }
            }
        }
    });
}

// Lancer l'init après le chargement
window.addEventListener('load', () => {
    setTimeout(initAudioPreview, 500);
});
