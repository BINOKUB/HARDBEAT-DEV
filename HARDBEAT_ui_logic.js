/* ==========================================
   HARDBEAT PRO - UI LOGIC (STABLE)
   ========================================== */
console.log("UI Logic : Chargement...");

let timerSeq1;
let currentTrackIndex = 0;
const stepsPerPage = 16;

function generateSteps(containerId, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 
    for (let i = 0; i < stepsPerPage; i++) {
        const step = document.createElement('div');
        step.classList.add(className);
        step.dataset.index = i;
        if (containerId === 'grid-seq1') {
            const num = document.createElement('span');
            num.innerText = i + 1;
            step.appendChild(num);
        }
        const led = document.createElement('div');
        led.classList.add('led');
        step.appendChild(led);
        container.appendChild(step);
    }
}

function generateFaders(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < stepsPerPage; i++) {
        const faderContainer = document.createElement('div');
        faderContainer.classList.add('fader-unit');
        faderContainer.innerHTML = `<span class="hz-label">440Hz</span><input type="range" class="freq-fader" min="20" max="15000" value="440">`;
        container.appendChild(faderContainer);
    }
}

function generateDrumControls() {
    const container = document.getElementById('instruments-params-container');
    if (!container) return;
    container.innerHTML = `
        <div id="params-track-0" class="instr-params" style="display:flex;"><span class="label-cyan">KIK ></span><div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div><div class="group"><label>DECAY</label><input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5"></div></div>
        <div id="params-track-1" class="instr-params" style="display:none;"><span class="label-cyan">SNARE ></span><div class="group"><label>SNAPPY</label><input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1"></div><div class="group"><label>TONE</label><input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000"></div></div>
        <div id="params-track-2" class="instr-params" style="display:none;"><span class="label-cyan">HH-CLOSE ></span><div class="group"><label>TONE</label><input type="range" id="hhc-tone" min="4000" max="12000" step="100" value="8000"></div></div>
    `;
    // Liaisons
    document.getElementById('kick-pitch').oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
    document.getElementById('kick-decay').oninput = (e) => kickSettings.decay = parseFloat(e.target.value);
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

    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (typeof checkSynthTick === "function") checkSynthTick(currentStep);

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// Initialisation
window.addEventListener('load', () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
    console.log("UI Logic : Initialisée.");
});

// Événements
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (pad) {
        const idx = parseInt(pad.dataset.index);
        const isDrum = pad.parentElement.id === 'grid-seq1';
        if (isDrum) {
            drumSequences[currentTrackIndex][idx] = !drumSequences[currentTrackIndex][idx];
            pad.classList.toggle('active');
            pad.querySelector('.led').style.background = drumSequences[currentTrackIndex][idx] ? "red" : "#330000";
        } else {
            synthSequences.seq2[idx] = !synthSequences.seq2[idx];
            pad.classList.toggle('active');
            pad.querySelector('.led').style.background = synthSequences.seq2[idx] ? "cyan" : "#330000";
        }
    }
    if (e.target.classList.contains('track-btn')) {
        currentTrackIndex = parseInt(e.target.dataset.track);
        showParamsForTrack(currentTrackIndex);
    }
});

const playBtn = document.getElementById('master-play-stop');
if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false; clearTimeout(timerSeq1);
            playBtn.innerText = "PLAY / STOP";
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true; playBtn.innerText = "STOP";
            runTick();
        }
    });
}
