/* ==========================================
   HARDBEAT PRO - UI LOGIC
   ========================================== */
let timerSeq1;
let currentTrackIndex = 0;

function initUI() {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
    showParamsForTrack(0);
}

function generateSteps(id, cl) {
    const cont = document.getElementById(id);
    if (!cont) return;
    cont.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        const step = document.createElement('div');
        step.className = cl;
        step.dataset.index = i;
        step.innerHTML = (id === 'grid-seq1') ? `<span>${i+1}</span><div class="led"></div>` : `<div class="led"></div>`;
        cont.appendChild(step);
    }
}

function generateDrumControls() {
    const cont = document.getElementById('instruments-params-container');
    if (!cont) return;
    cont.innerHTML = `<div id="params-track-0" class="instr-params" style="display:flex;"><span class="label-cyan">KICK ></span><div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div></div>`;
    // Liaison immédiate
    const pitch = document.getElementById('kick-pitch');
    if (pitch) pitch.oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
}

function showParamsForTrack(idx) {
    document.querySelectorAll('.instr-params').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`params-track-${idx}`);
    if (target) target.style.display = 'flex';
}

function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText) || 120;
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Drum logic
    if (drumSequences[0][currentStep]) playKick();
    // Synth logic
    checkSynthTick(currentStep);

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// Lancement au démarrage
window.addEventListener('load', initUI);

// Gestionnaire de clics global
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const isDrum = pad.parentElement.id === 'grid-seq1';
        if (isDrum) {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            pad.classList.toggle('active');
        } else {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active');
        }
    }
});

const playBtn = document.getElementById('master-play-stop');
if (playBtn) {
    playBtn.onclick = () => {
        if (isPlaying) {
            isPlaying = false; clearTimeout(timerSeq1);
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; runTick();
        }
    };
}
