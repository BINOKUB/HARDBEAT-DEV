// --- MODULE VISUALIZER (OSCILLOSCOPE) ---
// Ce module est indépendant. Il se greffe sur l'AudioContext existant.

window.initOscilloscope = function(audioCtx, sourceNode, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn("Canvas oscilloscope introuvable : " + canvasId);
        return;
    }

    console.log("Oscilloscope : Initialisation...");

    // 1. Création de l'analyseur
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048; // Résolution (plus c'est haut, plus c'est précis mais lourd)
    
    // 2. Connexion : Source -> Analyseur
    // (Note: On ne connecte pas l'analyseur à la destination, il est juste en "écoute" parallèle)
    sourceNode.connect(analyser);

    // 3. Préparation des données
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = canvas.getContext("2d");

    // 4. Boucle de dessin (Isolée ici)
    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        // Fond de l'écran (Noir total)
        ctx.fillStyle = "rgb(10, 10, 10)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Paramètres de la ligne
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00ffcc"; // Cyan Hardbeat (ou #d649ff pour Violet FM)
        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // Normalisation
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

    // Lancer l'animation
    draw();
    console.log("Oscilloscope : Actif 🟢");
};
