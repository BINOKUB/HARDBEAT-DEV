/* ==========================================
   HARDBEAT PRO - WAV RECORDER (STUDIO QUALITY)
   ========================================== */

let isRecording = false;
let recorderNode = null;
let recordingData = [[], []]; // Canal Gauche, Canal Droit
let sampleRate = 44100;

function initRecorder() {
    console.log("WAV Recorder: Ready.");
    const btnRec = document.getElementById('btn-rec');
    if (!btnRec) return;

    // GESTION DU CLIC
    btnRec.onclick = () => {
        if (!isRecording) {
            startRecording(btnRec);
        } else {
            stopRecording(btnRec);
        }
    };
}

function startRecording(btn) {
    if (!window.audioCtx || !window.masterGain) return;
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

    // Reset des buffers
    recordingData = [[], []];
    sampleRate = window.audioCtx.sampleRate;

    // Création du processeur (Capture le son brut)
    // Buffer de 4096 échantillons, 2 entrées, 2 sorties
    recorderNode = window.audioCtx.createScriptProcessor(4096, 2, 2);

    // Boucle de capture
    recorderNode.onaudioprocess = (e) => {
        if (!isRecording) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        
        // On copie les données (important de cloner)
        recordingData[0].push(new Float32Array(left));
        recordingData[1].push(new Float32Array(right));
    };

    // Connexion : Master -> Recorder -> Destination (pour ne pas couper le son)
    window.masterGain.connect(recorderNode);
    recorderNode.connect(window.audioCtx.destination);

    isRecording = true;
    btnRec.classList.add('recording');
    btnRec.innerText = "REC ●"; // Indicateur visuel
}

function stopRecording(btn) {
    if (!isRecording) return;

    isRecording = false;
    
    // Déconnexion propre
    if (recorderNode) {
        recorderNode.disconnect();
        recorderNode = null;
    }

    btnRec.classList.remove('recording');
    btnRec.innerText = "WAIT..."; // Petit temps de traitement

    // TRAITEMENT ASYNCHRONE (Pour ne pas figer l'interface)
    setTimeout(() => {
        exportWav();
        btnRec.innerText = "REC";
    }, 100);
}

function exportWav() {
    // 1. Aplatir les buffers (fusionner les morceaux)
    const leftBuffer = mergeBuffers(recordingData[0]);
    const rightBuffer = mergeBuffers(recordingData[1]);

    // 2. Entrelacer (Gauche, Droite, Gauche, Droite...)
    const interleaved = interleave(leftBuffer, rightBuffer);

    // 3. Créer le fichier binaire WAV
    const buffer = new ArrayBuffer(44 + interleaved.length * 2);
    const view = new DataView(buffer);

    // --- ÉCRITURE DU HEADER WAV (Standard RIFF) ---
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // Raw PCM
    view.setUint16(22, 2, true); // Stereo
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); // Byte rate
    view.setUint16(32, 4, true); // Block align
    view.setUint16(34, 16, true); // 16-bit
    writeString(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    // --- ÉCRITURE DES DONNÉES AUDIO (PCM 16-bit) ---
    floatTo16BitPCM(view, 44, interleaved);

    // 4. Téléchargement
    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `hardbeat_studio_${timestamp}.wav`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    
    console.log("WAV Export terminé.");
}

// --- UTILITAIRES AUDIO ---

function mergeBuffers(recBuffers) {
    let recLength = recBuffers.length * 4096; // Approximation taille
    let result = new Float32Array(recLength); // Devrait être calculé plus précisément mais ok pour script simple
    // Calcul précis de la longueur
    let length = 0;
    recBuffers.forEach(b => length += b.length);
    result = new Float32Array(length);
    
    let offset = 0;
    recBuffers.forEach(buffer => {
        result.set(buffer, offset);
        offset += buffer.length;
    });
    return result;
}

function interleave(inputL, inputR) {
    let length = inputL.length + inputR.length;
    let result = new Float32Array(length);

    let index = 0, inputIndex = 0;
    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        // Convertit float (-1.0 à 1.0) vers 16-bit PCM (-32768 à 32767)
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

window.addEventListener('load', () => {
    setTimeout(initRecorder, 500);
});
