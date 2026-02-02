/* ==========================================
   HARDBEAT PRO - VISUALIZER MODULE (OSCILLOSCOPE)
   ========================================== */
window.initOscilloscope = function(audioCtx, sourceNode, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; 

    console.log("VISUALIZER : Initialisation...");

    const ctx = canvas.getContext("2d");
    const analyser = audioCtx.createAnalyser();
    
    // Réglages : 2048 donne une ligne précise
    analyser.fftSize = 2048; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connexion
    sourceNode.connect(analyser);

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        // 1. Fond de l'écran (Noir Profond)
        // On utilise une légère transparence (0.2) pour créer un effet de traînée (Persistance rétinienne)
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Le Laser
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00f3ff"; // Cyan Hardbeat

        // --- EFFET NEON / GLOW (C'est ici que ça se joue) ---
        ctx.shadowBlur = 10;          // Taille du halo lumineux
        ctx.shadowColor = "#00f3ff";  // Couleur du halo (Même que la ligne)
        // ----------------------------------------------------

        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; 
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
        
        // IMPORTANT : On coupe le glow après le dessin pour ne pas affecter le reste du canvas
        ctx.shadowBlur = 0; 
    }

    draw(); 
    console.log("VISUALIZER : Actif 🟢");
};
