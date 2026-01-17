/* ==========================================
   HARDBEAT PRO - UI LOGIC
   ========================================== */
let timerSeq1;
let currentTrackIndex = 0;

// Génération complète au démarrage
function initRack() {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
    showParamsForTrack(0);
}

function generateSteps(id, cl) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        const div = document.createElement('div');
        div.className = cl;
        div.dataset.index = i;
        div.innerHTML = (id === 'grid-seq1') ? `<span>${i+1}</span><div class="led"></div>` : `<div class="led"></div>`;
        container.appendChild(div);
    }
}

function generateDrumControls() {
    const container = document.getElementById('instruments-params-container');
    if (!container) return;
    container.innerHTML = `
        <div id="params-track-0" class="instr-params"><span class="label-cyan">KIK ></span><div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div></div>
        <div id="params-track-1" class="instr-params"><span class="label-cyan">SNR ></span><div class="group"><label>TONE</label><input type="range" id="snare-tone" min="500" max="5000" value="1000"></div></div>
    `;
    // Liaison des événements (obligatoire après l'injection HTML)
    const kp = document.getElementById('kick-pitch'); if(kp) kp.oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
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

    // Trigger Sons
    if (drumSequences[0][currentStep]) playKick();
    if (synthSequences.seq2[currentStep]) {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        if (faders[currentStep]) playSynthNote(parseFloat(faders[currentStep].value));
    }

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

window.addEventListener('load', initRack);

// --- ÉCOUTEUR GLOBAL (Pour éviter les bugs de clic) ---
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const parentId = pad.parentElement.id;
        
        if (parentId === 'grid-seq1') {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            pad.classList.toggle('active', drumSequences[currentTrackIndex][idx]);
            pad.querySelector('.led').style.background = drumSequences[currentTrackIndex][idx] ? "red" : "#330000";
        } else if (parentId === 'grid-seq2') {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active', synthSequences.seq2[idx]);
            pad.querySelector('.led').style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
    }

    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        showParamsForTrack(currentTrackIndex);
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
