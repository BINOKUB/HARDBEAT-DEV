/* ==========================================
   HARDBEAT PRO - UI LOGIC (STATIC BINDING)
   ========================================== */
console.log("UI Logic : Démarrage...");

let timerSeq1;
let currentTrackIndex = 0;

// Génère juste les grilles (Pads et Faders)
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

// Gestion de l'affichage des paramètres
function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

// Bindings des Sliders (Kick, etc.)
function bindControls() {
    const bind = (id, obj, prop) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => obj[prop] = parseFloat(e.target.value);
    };

    // Drums
    bind('kick-pitch', kickSettings, 'pitch');
    bind('kick-decay', kickSettings, 'decay');
    bind('snare-tone', snareSettings, 'tone');
    
    // Master Synth
    bind('synth-disto', synthParams, 'disto');
    bind('synth-res', synthParams, 'resonance');
    
    // Volume Master
    const vol = document.getElementById('master-gain');
    if(vol) vol.oninput = (e) => masterGain.gain.value = parseFloat(e.target.value);
}

// Boucle principale (Blindée)
function runTick() {
    if (!isPlaying) return;

    // Calcul du tempo
    const bpmEl = document.getElementById('display-bpm1');
    const bpm = bpmEl ? parseInt(bpmEl.innerText) : 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Animation visuelle
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // Trigger Audio
    if (drumSequences && drumSequences[0] && drumSequences[0][currentStep]) playKick();
    if (drumSequences && drumSequences[1] && drumSequences[1][currentStep]) playSnare();
    
    // Trigger Synth
    checkSynthTick(currentStep);

    // Avance
    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// Démarrage
window.addEventListener('load', () => {
    initGrid();
    bindControls();
    showParamsForTrack(0); // Affiche le Kick par défaut
    console.log("UI Logic : Initialisée.");
});

// Événements globaux
document.addEventListener('click', (e) => {
    // Clic sur PAD
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const parentId = pad.parentElement.id;
        
        if (parentId === 'grid-seq1') {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            pad.classList.toggle('active', drumSequences[currentTrackIndex][idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = drumSequences[currentTrackIndex][idx] ? "red" : "#330000";
        } 
        else if (parentId === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            const led = pad.querySelector('.led');
            if(led) led.style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
    }

    // Clic sur TRACK SELECTOR
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        showParamsForTrack(currentTrackIndex);
    }
});

// Play / Stop
const playBtn = document.getElementById('master-play-stop');
if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false; 
            clearTimeout(timerSeq1);
            playBtn.innerText = "PLAY / STOP";
            playBtn.style.background = "#222";
            playBtn.style.color = "#fff";
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; 
            playBtn.innerText = "STOP";
            playBtn.style.background = "#00f3ff";
            playBtn.style.color = "#000";
            runTick();
        }
    });
}
