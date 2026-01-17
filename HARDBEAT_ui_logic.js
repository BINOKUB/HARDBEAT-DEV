/* ==========================================
   HARDBEAT PRO - UI LOGIC (POLYRHYTHM ENGINE)
   ========================================== */
let timerDrums;
let timerSynths;
let isMetroOn = false;

// --- GESTION POLYRYTHMIE ---
// Chaque piste a sa propre longueur (défaut 16) et sa propre position de lecture
let trackLengths = [16, 16, 16, 16, 16]; 
let trackPositions = [0, 0, 0, 0, 0]; // Remplace l'ancien currentDrumStep unique

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

    // --- DRUMS & POLYRYTHMIE ---
    // Fonction pour lier les sliders de longueur de pas
    const bindSteps = (id, trackIdx) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => {
            trackLengths[trackIdx] = parseInt(e.target.value);
            // Si on raccourcit, on reset la position pour éviter les bugs
            if (trackPositions[trackIdx] >= trackLengths[trackIdx]) {
                trackPositions[trackIdx] = 0;
            }
            refreshGridVisuals(); // Met à jour le grisé immédiatement
        };
    };

    // Bindings Instruments
    bindSteps('kick-steps', 0);
    bind('kick-pitch', kickSettings, 'pitch');
    bind('kick-decay', kickSettings, 'decay');
    bind('kick-level', kickSettings, 'level');

    bindSteps('snare-steps', 1);
    bind('snare-tone', snareSettings, 'tone');
    bind('snare-snappy', snareSettings, 'snappy');
    bind('snare-level', snareSettings, 'level');

    bindSteps('hhc-steps', 2);
    bind('hhc-tone', hhSettings, 'tone');
    bind('hhc-level', hhSettings, 'levelClose');

    bindSteps('hho-steps', 3);
    bind('hho-decay', hhSettings, 'decayOpen');
    bind('hho-level', hhSettings, 'levelOpen');

    bindSteps('fm-steps', 4);
    bind('fm-carrier', fmSettings, 'carrierPitch');
    bind('fm-mod', fmSettings, 'modPitch');
    bind('fm-amt', fmSettings, 'fmAmount');
    bind('fm-decay', fmSettings, 'decay');
    bind('fm-level', fmSettings, 'level');

    // Global Controls
    const accSlider = document.getElementById('global-accent-amount');
    if(accSlider) accSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        if(window.updateAccentBoost) window.updateAccentBoost(val);
        const label = document.getElementById('accent-val-display');
        if(label) label.innerText = val.toFixed(1) + 'x';
    };

    const metroBox = document.getElementById('metro-toggle');
    if(metroBox) metroBox.onchange = (e) => isMetroOn = e.target.checked;

    // Synth Controls
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

    // Récupérer la longueur de la piste ACTUELLE
    const currentLen = trackLengths[currentTrackIndex];

    pads.forEach((pad, i) => {
        // GESTION DU GRISÉ (Hors Boucle)
        if (i >= currentLen) {
            pad.classList.add('disabled');
        } else {
            pad.classList.remove('disabled');
        }

        // GESTION NOTES
        if(drumSequences && drumSequences[currentTrackIndex]) {
            const isActive = drumSequences[currentTrackIndex][i];
            pad.classList.toggle('active', isActive);
            const led = pad.querySelector('.led');
            if (led) led.style.background = isActive ? "red" : "#330000";
        }
    });

    // GESTION ACCENTS
    accents.forEach((acc, i) => {
        // On grise aussi les boutons d'accent hors boucle
        if (i >= currentLen) {
            acc.style.opacity = "0.2";
            acc.style.pointerEvents = "none";
        } else {
            acc.style.opacity = "1";
            acc.style.pointerEvents = "auto";
        }

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

// --- BOUCLE POLYRYTHMIQUE ---
function runDrumLoop() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    // On divise par 4 pour avoir des doubles-croches standards
    const stepDuration = (60 / bpm) / 4 * 1000;

    // --- VISUEL DE LA TÊTE DE LECTURE (Seulement pour la piste qu'on regarde) ---
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach(p => p.style.borderColor = "#333");
    
    // On récupère la position actuelle de la piste active
    const activePos = trackPositions[currentTrackIndex];
    
    // On n'affiche le carré blanc que si on est dans la zone active
    if (pads[activePos]) {
        pads[activePos].style.borderColor = "#ffffff";
    }

    // --- LOGIQUE AUDIO INDÉPENDANTE (Cerveau Multiple) ---
    // On boucle sur les 5 pistes (0=Kick, 1=Snare, 2=HHC, 3=HHO, 4=FM)
    for (let i = 0; i < 5; i++) {
        let pos = trackPositions[i];
        let len = trackLengths[i];
        
        // Si c'est le moment de jouer
        if (drumSequences[i][pos]) {
            let acc = drumAccents[i][pos];
            switch(i) {
                case 0: playKick(acc); break;
                case 1: playSnare(acc); break;
                case 2: playHiHat(false, acc); break;
                case 3: playHiHat(true, acc); break;
                case 4: playDrumFM(acc); break;
            }
        }

        // Métronome (Optionnel: basique, calé sur le kick pour l'instant)
        if (i === 0 && isMetroOn && pos % 4 === 0) {
            if(window.playMetronome) playMetronome(pos === 0);
        }

        // AVANCER LE CURSEUR DE CETTE PISTE
        trackPositions[i] = (trackPositions[i] + 1) % len;
    }

    timerDrums = setTimeout(runDrumLoop, stepDuration);
}

// --- BOUCLE SYNTHS (Reste synchrone pour l'instant) ---
let currentSynthStep = 0;

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
        // Empêcher l'interaction si désactivé (hors boucle)
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

    // ACCENT
    const accentBtn = e.target.closest('.accent-pad');
    if (accentBtn) {
        // Check disabled
        const parentCol = accentBtn.closest('.step-column');
        const padAbove = parentCol.querySelector('.step-pad');
        if (padAbove.classList.contains('disabled')) return;

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
                
                // RESET POSITIONS ON START (Optionnel, mais plus propre)
                trackPositions = [0,0,0,0,0]; 
                
                runDrumLoop();
                runSynthLoop();
            }
        };
    }
    console.log("UI Logic : Prêt (Polyrhythms Active).");
});
