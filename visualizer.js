/* ==========================================
   HARDBEAT PRO - VISUALIZER MODULE (OSCILLOSCOPE)
   ========================================== */
window.initOscilloscope = function(audioCtx, sourceNode, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; // Si l'écran n'est pas dans le HTML, on ne fait rien.

    console.log("VISUALIZER : Initialisation de l'écran...");

    const ctx = canvas.getContext("2d");
    const analyser = audioCtx.createAnalyser();
    
    // Réglages de précision
    analyser.fftSize = 2048; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connexion : On écoute la source sans couper le son
    sourceNode.connect(analyser);

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        // 1. Fond de l'écran (Noir Profond)
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. La Ligne (Cyan Néon Hardbeat)
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00f3ff"; 
        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // Normalisation (0 à 2)
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    draw(); // Lancement de la boucle
    console.log("VISUALIZER : Actif 🟢");
};
