/* ==========================================
   HARDBEAT PRO - WAV RECORDER (STUDIO QUALITY - FIX V2)
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
            startRecording(btnRec); // On passe le bouton en paramètre
        } else {
            stopRecording(btnRec);
        }
    };
}

function startRecording(btn) {
    // Vérifications de sécurité
    if (!window.audioCtx || !window.masterGain) {
        console.error("Recorder Error: AudioCtx or MasterGain missing.");
        return;
    }
    
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

    // Reset des buffers
    recordingData = [[], []];
    sampleRate = window.audioCtx.sampleRate;

    // Création du processeur (Capture le son brut)
    // Utilisation de ScriptProcessor (déprécié mais universel pour ce besoin simple)
    recorderNode = window.audioCtx.createScriptProcessor(4096, 2, 2);

    // Boucle de capture
    recorderNode.onaudioprocess = (e) => {
        if (!isRecording) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        
        // On copie les données
        recordingData[0].push(new Float32Array(left));
        recordingData[1].push(new Float32Array(right));
    };

    // Connexion : Master -> Recorder -> Destination
    window.masterGain.connect(recorderNode);
    recorderNode.connect(window.audioCtx.destination);

    isRecording = true;
    
    // CORRECTION ICI : On utilise 'btn' et non 'btnRec'
    btn.classList.add('recording');
    btn.innerText = "REC ●"; 
}

function stopRecording(btn) {
    if (!isRecording) return;

    isRecording = false;
    
    // Déconnexion propre
    if (recorderNode) {
        recorderNode.disconnect();
        recorderNode = null;
    }

    // CORRECTION ICI : On utilise 'btn'
    btn.classList.remove('recording');
    btn.innerText = "WAIT..."; 

    // TRAITEMENT ASYNCHRONE
    setTimeout(() => {
        exportWav();
        btn.innerText = "REC"; // Remet le texte à la normale
    }, 100);
}

function exportWav() {
    // 1. Aplatir les buffers
    const leftBuffer = mergeBuffers(recordingData[0]);
    const rightBuffer = mergeBuffers(recordingData[1]);

    // 2. Entrelacer
    const interleaved = interleave(leftBuffer, rightBuffer);

    // 3. Créer le fichier binaire WAV
    const buffer = new ArrayBuffer(44 + interleaved.length * 2);
    const view = new DataView(buffer);

    // Header WAV
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, 2, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); 
    view.setUint16(32, 4, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    // Données Audio
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

// --- UTILITAIRES ---
function mergeBuffers(recBuffers) {
    let length = 0;
    recBuffers.forEach(b => length += b.length);
    let result = new Float32Array(length);
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
