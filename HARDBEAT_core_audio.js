/* ==========================================
   HARDBEAT PRO - CORE AUDIO ENGINE
   ========================================== */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

// État du séquenceur
let isPlaying = false;
let currentStep = 0;
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));

// Paramètres de synthèse
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

// --- FONCTIONS DE SYNTHÈSE PURE ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(masterGain);
    osc.frequency.setValueAtTime(kickSettings.pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    gain.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    osc.start(); osc.stop(audioCtx.currentTime + kickSettings.decay);
}

function playSnare() {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) { data[i] = Math.random() * 2 - 1; }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(snareSettings.tone, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    noiseSource.connect(filter); filter.connect(gain); gain.connect(masterGain);
    gain.gain.setValueAtTime(snareSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2 * snareSettings.snappy);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + 0.2);
}

function playHiHat(isOpen) {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) { data[i] = Math.random() * 2 - 1; }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(hhSettings.tone, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    noiseSource.connect(filter); filter.connect(gain); gain.connect(masterGain);
    const duration = isOpen ? hhSettings.decayOpen : hhSettings.decayClose;
    const level = isOpen ? hhSettings.levelOpen : hhSettings.levelClose;
    gain.gain.setValueAtTime(level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + duration);
}

function playDrumFM() {
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const mainGain = audioCtx.createGain();
    modulator.frequency.value = fmSettings.modPitch;
    modGain.gain.value = fmSettings.fmAmount;
    carrier.frequency.value = fmSettings.carrierPitch;
    modulator.connect(modGain); modGain.connect(carrier.frequency);
    carrier.connect(mainGain); mainGain.connect(masterGain);
    mainGain.gain.setValueAtTime(fmSettings.level, audioCtx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + fmSettings.decay);
    carrier.start(); modulator.start();
    carrier.stop(audioCtx.currentTime + fmSettings.decay); modulator.stop(audioCtx.currentTime + fmSettings.decay);
}
🕹️ 2. La Logique : HARDBEAT_ui_logic.js
C'est ici que l'on gère les clics, les sliders, le dessin des pads et le "tick" du séquenceur qui fait le pont avec le son.

JavaScript

/* ==========================================
   HARDBEAT PRO - UI & SEQUENCER LOGIC
   ========================================== */

let timerSeq1;
let currentTrackIndex = 0;
const stepsPerPage = 16;

// --- GÉNÉRATION DE L'INTERFACE ---
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

// ... (Je garde ici tes fonctions generateFaders, initFaderLogic, generateDrumControls) ...

function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000;

    // Visuels de la tête de lecture
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // Déclenchement Audio
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false);
    if (drumSequences[3][currentStep]) playHiHat(true);
    if (drumSequences[4][currentStep]) playDrumFM();

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
document.getElementById('master-play-stop').addEventListener('click', (e) => {
    if (isPlaying) {
        isPlaying = false; 
        clearTimeout(timerSeq1);
        e.target.innerText = "PLAY / STOP";
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        isPlaying = true; 
        e.target.innerText = "STOP";
        runTick();
    }
});

// Initialisation au chargement
window.addEventListener('load', () => {
    generateSteps('grid-seq1', 'step-pad');
    generateDrumControls();
    // ... reste de l'initialisation
});
