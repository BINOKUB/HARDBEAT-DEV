/* ==========================================
   HARDBEAT PRO - UI & SEQUENCER LOGIC (DEV)
   ========================================== */

let timerSeq1;
let currentTrackIndex = 0;
const stepsPerPage = 16;

// --- GÉNÉRATION DE L'INTERFACE ---

/**
 * Génère les pads pour les grilles de séquences
 */
function generateSteps(containerId, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 
    for (let i = 0; i < stepsPerPage; i++) {
        const step = document.createElement('div');
        step.classList.add(className);
        step.dataset.index = i;
        
        // Ajout du numéro pour la SEQ 1 (Drums)
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

/**
 * Génère les faders de fréquences pour le synthé
 */
function generateFaders(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < stepsPerPage; i++) {
        const faderContainer = document.createElement('div');
        faderContainer.classList.add('fader-unit');
        faderContainer.innerHTML = `
            <span class="hz-label">440Hz</span>
            <input type="range" class="freq-fader" min="20" max="15000" value="440">
        `;
        container.appendChild(faderContainer);
    }
}

/**
 * Initialise l'affichage des valeurs des faders
 */
function initFaderLogic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.freq-fader').forEach(fader => {
        fader.oninput = (e) => {
            const label = e.target.previousElementSibling;
            label.innerText = e.target.value + "Hz";
            label.style.color = "#00f3ff";
        };
    });
}

/**
 * Génère les contrôles de paramètres pour chaque piste de batterie
 */
function generateDrumControls() {
    const container = document.getElementById('instruments-params-container');
    if (!container) return;
    
    const html = `
        <div id="params-track-0" class="instr-params">
            <span class="label-cyan">KICK ></span>
            <div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div>
            <div class="group"><label>DECAY</label><input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5"></div>
        </div>
        <div id="params-track-1" class="instr-params">
            <span class="label-cyan">SNARE ></span>
            <div class="group"><label>SNAPPY</label><input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1"></div>
            <div class="group"><label>TONE</label><input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000"></div>
        </div>
        <div id="params-track-2" class="instr-params">
            <span class="label-cyan">HH-CLOSE ></span>
            <div class="group"><label>TONE</label><input type="range" id="hhc-tone" min="4000" max="12000" step="100" value="8000"></div>
            <div class="group"><label>LEVEL</label><input type="range" id="hhc-level" min="0" max="1" step="0.1" value="0.4"></div>
        </div>
        <div id="params-track-3" class="instr-params">
            <span class="label-cyan">HH-OPEN ></span>
            <div class="group"><label>DECAY</label><input type="range" id="hho-decay" min="0.1" max="0.8" step="0.05" value="0.3"></div>
            <div class="group"><label>LEVEL</label><input type="range" id="hho-level" min="0" max="1" step="0.1" value="0.5"></div>
        </div>
        <div id="params-track-4" class="instr-params">
            <span class="label-cyan">DRUM FM ></span>
            <div class="group"><label>CARRIER</label><input type="range" id="fm-carrier" min="20" max="1000" value="100"></div>
            <div class="group"><label>MOD</label><input type="range" id="fm-mod" min="1" max="1000" value="50"></div>
            <div class="group"><label>FM AMT</label><input type="range" id="fm-amt" min="0" max="2000" value="100"></div>
            <div class="group"><label>DECAY</label><input type="range" id="fm-decay" min="0.05" max="1.5" step="0.05" value="0.3"></div>
        </div>`;
    
    container.innerHTML = html;

    // Liaisons avec les variables de core_audio.js
    document.getElementById('kick-pitch').oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
    document.getElementById('kick-decay').oninput = (e) => kickSettings.decay = parseFloat(e.target.value);
    document.getElementById('snare-snappy').oninput = (e) => snareSettings.snappy = parseFloat(e.target.value);
    document.getElementById('snare-tone').oninput = (e) => snareSettings.tone = parseFloat(e.target.value);
    document.getElementById('hhc-tone').oninput = (e) => hhSettings.tone = parseFloat(e.target.value);
    document.getElementById('hhc-level').oninput = (e) => hhSettings.levelClose = parseFloat(e.target.value);
    document.getElementById('hho-decay').oninput = (e) => hhSettings.decayOpen = parseFloat(e.target.value);
    document.getElementById('hho-level').oninput = (e) => hhSettings.levelOpen = parseFloat(e.target.value);
    document.getElementById('fm-carrier').oninput = (e) => fmSettings.carrierPitch = parseFloat(e.target.value);
    document.getElementById('fm-mod').oninput = (e) => fmSettings.modPitch = parseFloat(e.target.value);
    document.getElementById('fm-amt').oninput = (e) => fmSettings.fmAmount = parseFloat(e.target.value);
    document.getElementById('fm-decay').oninput = (e) => fmSettings.decay = parseFloat(e.target.value);
    document.getElementById('fm-level').oninput = (e) => fmSettings.level = parseFloat(e.target.value);
}

/**
 * Gère la visibilité des paramètres selon la piste sélectionnée
 */
function showParamsForTrack(trackIndex) {
    document.querySelectorAll('.instr-params').forEach(el => el.style.display = 'none');
    const activeParams = document.getElementById(`params-track-${trackIndex}`);
    if (activeParams) activeParams.style.display = 'flex';
}

// --- RUNTIME & SEQUENCER ---

function runTick() {
    if (!isPlaying) return;
    
    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Visuel de la tête de lecture
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // Appels sonores vers core_audio.js
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false);
    if (drumSequences[3][currentStep]) playHiHat(true);
    if (drumSequences[4][currentStep]) playDrumFM();
    
    // Appel au tick du synthé
    if (typeof checkSynthTick === "function") checkSynthTick(currentStep);

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

function updatePadVisuals() {
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach((pad, i) => {
        const led = pad.querySelector('.led');
        const isActive = drumSequences[currentTrackIndex][i];
        pad.classList.toggle('active', isActive);
        led.style.background = isActive ? "#ff0000" : "#330000";
        led.style.boxShadow = isActive ? "0 0 10px #ff0000" : "none";
    });
}

// --- INITIALISATION ---

window.addEventListener('load', () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    initFaderLogic('grid-freq-seq2');
    generateDrumControls();
    
    // Affiche le Kick par défaut
    showParamsForTrack(0);

    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');

    // Master Volume
    const masterVol = document.getElementById('master-gain'); 
    if (masterVol) {
        masterVol.oninput = (e) => {
            masterGain.gain.setTargetAtTime(parseFloat(e.target.value), audioCtx.currentTime, 0.02);
        };
    }
});

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---

document.addEventListener('click', (e) => {
    // Clic sur Pads Drums
    if (e.target.closest('.step-pad') && e.target.closest('#grid-seq1')) {
        const pad = e.target.closest('.step-pad');
        const index = parseInt(pad.dataset.index);
        drumSequences[currentTrackIndex][index] = !drumSequences[currentTrackIndex][index];
        updatePadVisuals();
    }
    
    // Changement de Track
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        updatePadVisuals();
        showParamsForTrack(currentTrackIndex);
    }

    // Clic sur Pads Synth
    const synthPad = e.target.closest('.step-pad');
    if (synthPad && (synthPad.parentElement.id === 'grid-seq2' || synthPad.parentElement.id === 'grid-seq3')) {
        const container = synthPad.parentElement;
        const stepIndex = parseInt(synthPad.dataset.index);
        const isSeq2 = (container.id === 'grid-seq2');
        const targetSeq = isSeq2 ? synthSequences.seq2 : synthSequences.seq3;
        const color = isSeq2 ? "#00f3ff" : "#7000ff";

        targetSeq[stepIndex] = !targetSeq[stepIndex];
        synthPad.classList.toggle('active');
        const led = synthPad.querySelector('.led');
        led.style.background = targetSeq[stepIndex] ? color : "#330000";
        led.style.boxShadow = targetSeq[stepIndex] ? `0 0 10px ${color}` : "none";
    }
});

// Play / Stop
const playBtn = document.getElementById('master-play-stop');
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false; 
        clearTimeout(timerSeq1);
        playBtn.innerText = "PLAY / STOP";
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        isPlaying = true; 
        playBtn.innerText = "STOP";
        runTick();
    }
});

function setupTempoDrag(displayId) {
    const display = document.getElementById(displayId);
    if (!display) return;
    let isDragging = false, startY = 0, startBpm = 0;
    display.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startBpm = parseInt(display.innerText); });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = Math.floor((startY - e.clientY) / 2);
        display.innerText = Math.max(40, Math.min(220, startBpm + delta));
    });
    window.addEventListener('mouseup', () => isDragging = false);
}
