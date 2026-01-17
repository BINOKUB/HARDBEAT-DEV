/* ==========================================
   HARDBEAT PRO - UI LOGIC (FINAL + EXTENSIONS)
   ========================================== */
let timerSeq1;
let currentTrackIndex = 0;

function initGrid(idPrefix) {
    // Générateur générique de grille
    const drumGrid = document.getElementById(idPrefix);
    if (!drumGrid) return;
    drumGrid.innerHTML = '';
    
    // Si c'est SEQ1, on met des numéros
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

    // Synth
    const distoSlider = document.getElementById('synth-disto');
    if (distoSlider) distoSlider.oninput = (e) => {
        if(window.updateDistortion) window.updateDistortion(parseFloat(e.target.value));
    };
    bind('synth-res', synthParams, 'resonance');
    bind('synth-cutoff', synthParams, 'cutoffEnv');
    
    const dAmt = document.getElementById('synth-delay-amt');
    if(dAmt) dAmt.oninput = (e) => {
        synthParams.delayAmt = parseFloat(e.target.value);
        if(typeof delayMix !== 'undefined') delayMix.gain.value = synthParams.delayAmt;
        if(typeof feedback !== 'undefined') feedback.gain.value = synthParams.delayAmt * 0.7;
    };
    
    const dTime = document.getElementById('synth-delay-time');
    if(dTime) dTime.oninput = (e) => {
        synthParams.delayTime = parseFloat(e.target.value);
        if(typeof delayNode !== 'undefined') delayNode.delayTime.value = synthParams.delayTime;
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

// --- FONCTION TEMPO DRAG (Le retour !) ---
function setupTempoDrag(id) {
    const el = document.getElementById(id);
    if(!el) return;
    
    let isDragging = false;
    let startY = 0;
    let startVal = 0;

    el.style.cursor = "ns-resize";

    el.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startVal = parseInt(el.innerText);
        document.body.style.cursor = "ns-resize";
        e.preventDefault(); // Empêche la sélection de texte
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const diff = startY - e.clientY; // Vers le haut = positif
        let newVal = startVal + Math.floor(diff / 2); // Sensibilité
        if (newVal < 40) newVal = 40;
        if (newVal > 300) newVal = 300;
        el.innerText = newVal;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.cursor = "default";
    });
}

// --- FONCTION EXTENSION SEQ 3 ---
function initSeq3Extension() {
    const btn = document.getElementById('add-seq-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // 1. Désactiver le bouton
        btn.disabled = true;
        btn.style.opacity = "0.3";
        btn.innerText = "SEQ 3 ACTIVE";

        // 2. Créer le HTML
        const zone = document.getElementById('extension-zone');
        const seq3HTML = `
        <section id="seq3-container" class="rack-section synth-instance">
            <div class="section-header">
                <h2 style="color:#a855f7">SEQ 3 : HARDGROOVE LAYER</h2>
                <div class="bpm-control">
                    <label>SYNC</label>
                    <span style="color:#666; font-size:10px;">LOCKED TO SEQ 2</span>
                </div>
            </div>
            <div class="freq-sliders-container" id="grid-freq-seq3"></div>
            <div class="step-grid" id="grid-seq3"></div>
        </section>
        `;
        zone.innerHTML = seq3HTML;

        // 3. Initialiser les contrôles de cette nouvelle section
        initGrid('grid-seq3');
        initFaders('grid-freq-seq3');
        
        // Petite animation de scroll
        document.getElementById('seq3-container').scrollIntoView({ behavior: 'smooth' });
    });
}

function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false);
    if (drumSequences[3][currentStep]) playHiHat(true);
    if (drumSequences[4][currentStep]) playDrumFM();

    checkSynthTick(currentStep); // Gère Seq2 ET Seq3 maintenant

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

function initRandomizer() {
    const btn = document.querySelector('.btn-random');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        btn.style.background = "#00f3ff"; btn.style.color = "#000";
        setTimeout(() => { btn.style.background = ""; btn.style.color = ""; }, 100);
        faders.forEach(fader => {
            const randomFreq = Math.floor(Math.random() * (880 - 50) + 50);
            fader.value = randomFreq;
            if (fader.previousElementSibling) fader.previousElementSibling.innerText = randomFreq + "Hz";
        });
    });
}

window.addEventListener('load', () => {
    initGrid('grid-seq1'); // Drums
    initGrid('grid-seq2'); // Synth
    initFaders('grid-freq-seq2');
    
    bindControls();
    showParamsForTrack(0);
    initRandomizer();
    
    // NOUVEAU : ACTIVATION DES FONCTIONS
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2'); // Juste visuel pour l'instant
    initSeq3Extension();

    console.log("UI Logic : Prêt (V4 - Full Features).");
});

document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const parentId = pad.parentElement.id;
        
        if (parentId === 'grid-seq1') {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            refreshGridVisuals();
        } 
        else if (parentId === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
        else if (parentId === 'grid-seq3') { // GESTION SEQ 3
            synthSequences.seq3[idx] = !synthSequences.seq3[idx];
            pad.classList.toggle('active', synthSequences.seq3[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq3[idx] ? "#a855f7" : "#330000"; // Violet
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
            isPlaying = false; clearTimeout(timerSeq1);
            playBtn.innerText = "PLAY / STOP";
            playBtn.style.background = "#222"; playBtn.style.color = "#fff";
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; 
            playBtn.innerText = "STOP";
            playBtn.style.background = "#00f3ff"; playBtn.style.color = "#000";
            runTick();
        }
    };
}
