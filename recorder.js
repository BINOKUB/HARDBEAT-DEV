/* ==========================================
   HARDBEAT PRO - AUDIO RECORDER (V1)
   ========================================== */

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

function initRecorder() {
    console.log("Recorder: Init...");
    const btnRec = document.getElementById('btn-rec');
    if(!btnRec) return;

    // Vérification de sécurité
    if (!window.audioCtx || !window.masterGain) {
        console.error("Recorder: Impossible de trouver masterGain.");
        return;
    }

    // 1. Créer une destination de flux (Le Câble Virtuel)
    const dest = window.audioCtx.createMediaStreamDestination();
    
    // 2. Brancher le Master sur ce flux (En plus des enceintes)
    window.masterGain.connect(dest);

    // 3. Configurer le Magnéto
    const options = { mimeType: 'audio/webm' }; // Standard haute qualité web
    try {
        mediaRecorder = new MediaRecorder(dest.stream, options);
    } catch (e) {
        // Fallback si webm n'est pas supporté (ex: Safari)
        mediaRecorder = new MediaRecorder(dest.stream);
    }

    // 4. Quand des données arrivent (pendant l'enregistrement)
    mediaRecorder.ondataavailable = function(evt) {
        if (evt.data.size > 0) {
            recordedChunks.push(evt.data);
        }
    };

    // 5. Quand on arrête l'enregistrement (Le Téléchargement)
    mediaRecorder.onstop = function() {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Créer un lien invisible pour télécharger
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Nom du fichier : hardbeat_session_[TIMESTAMP].webm
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `hardbeat_session_${timestamp}.webm`;
        
        document.body.appendChild(a);
        a.click();
        
        // Nettoyage
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        recordedChunks = []; // Reset pour la prochaine fois
        console.log("Recorder: Fichier téléchargé.");
    };

    // 6. GESTION DU BOUTON
    btnRec.onclick = () => {
        if (!isRecording) {
            // START
            if(window.audioCtx.state === 'suspended') window.audioCtx.resume();
            recordedChunks = [];
            mediaRecorder.start();
            isRecording = true;
            btnRec.classList.add('recording');
            btnRec.innerText = "REC ●";
        } else {
            // STOP
            mediaRecorder.stop();
            isRecording = false;
            btnRec.classList.remove('recording');
            btnRec.innerText = "REC";
        }
    };
}

// Lancer l'init au chargement de la page
window.addEventListener('load', () => {
    // On attend un peu que audio.js soit prêt
    setTimeout(initRecorder, 500);
});
