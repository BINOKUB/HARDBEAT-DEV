/* ==========================================
   HARDBEAT PRO - UI LOGIC (CORRECTED & ACTIVE)
   ========================================== */
console.log("UI Logic : Démarrage...");

let timerSeq1;
let currentTrackIndex = 0;

// --- INITIALISATION ---
function initGrid() {
    // PADS DRUMS
    const drumGrid = document.getElementById('grid-seq1');
    if (drumGrid) {
        drumGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            drumGrid.innerHTML += `<div class="step-pad" data-index="${i}"><span>${i+1}</span><div class="led"></div></div>`;
        }
    }
    // PADS SYNTH
    const synthGrid = document.getElementById('grid-seq2');
    if (synthGrid) {
        synthGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            synthGrid.innerHTML += `<div class="step-pad" data-index="${i}"><div class="led"></div></div>`;
        }
    }
    // FADERS SYNTH
    const freqGrid = document.getElementById('grid-freq-seq2');
    if (freqGrid) {
        freqGrid.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            freqGrid.innerHTML += `
                <div class="fader-unit">
                    <span class="hz-label">440Hz</span>
                    <input type="range" class="freq-fader" min="50" max="880" value="440" oninput="this.previousElementSibling.innerText=this.value+'Hz'">
                </div>`;
        }
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
    bind('snare-tone', snareSettings, 'tone');
    bind('snare-snappy', snareSettings, 'snappy');
    // Master Synth
    bind('synth-disto', synthParams, 'disto');
    bind('synth-res', synthParams, 'resonance');
    bind('synth-cutoff', synthParams, 'cutoffEnv');
    bind('synth-delay-amt', synthParams, 'delayAmt');
    bind('synth-delay-time', synthParams, 'delayTime');
    // Volume
    const vol = document.getElementById('master-gain');
    if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);
}

// --- GESTION DE L'AFFICHAGE ---

// 1. Affiche les sliders du bon instrument
function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

// 2. LE CORRECTIF : Met à jour les LEDs de la grille selon la piste choisie
function refreshGridVisuals() {
    const pads = document.querySelectorAll('#grid-seq1 .step-pad');
    pads.forEach((pad, i) => {
        // On regarde si la note est active dans la piste COURANTE
        const isActive = drumSequences[currentTrackIndex][i];
        
        pad.classList.toggle('active', isActive);
        const led = pad.querySelector('.led');
        if (led) led.style.background = isActive ? "red" : "#330000";
    });
}

// --- MOTEUR DE SEQUENCAGE ---
function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Animation tête de lecture
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // Audio Trigger
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    // (Ajoute ici les HH et FM si tu as les fonctions dans core_audio)

    checkSynthTick(currentStep);

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// --- FONCTION RANDOMIZE ---
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

// --- STARTUP ---
window.addEventListener('load', () => {
    initGrid();
    bindControls();
    showParamsForTrack(0);
    initRandomizer();
    console.log("UI Logic : Prêt et Corrigé.");
});

// --- ÉVÉNEMENTS GLOBAUX ---
document.addEventListener('click', (e) => {
    // CLIC SUR PAD
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const parentId = pad.parentElement.id;
        
        if (parentId === 'grid-seq1') {
            // On inverse l'état dans la mémoire
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            // On met à jour le visuel immédiatement
            refreshGridVisuals(); 
        } 
        else if (parentId === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
    }

    // CLIC SUR TRACK SELECTOR (CORRECTION ICI)
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // 1. On change l'index de la piste
        currentTrackIndex = parseInt(e.target.dataset.track);
        
        // 2. On affiche les bons sliders (Pitch, Decay...)
        showParamsForTrack(currentTrackIndex);
        
        // 3. IMPORTANT : On rafraîchit la grille pour afficher les notes de CETTE piste
        refreshGridVisuals();
    }
});

// Play / Stop
const playBtn = document.getElementById('master-play-stop');
if (playBtn) {
    playBtn.addEventListener('click', () => {
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
    });
}
