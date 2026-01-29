// ------------------------------------------------------
    // 2. IMPORT : Version "Force Brute"
    // ------------------------------------------------------
    importPreset: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                console.log("📂 Chargement:", data);

                // --- 1. Paramètres Globaux ---
                
                // BPM : On met à jour TOUT ce qui existe
                if (data.bpm) {
                    const safeBpm = Math.min(Math.max(data.bpm, 40), 300); // Clamping (Sécurité)
                    
                    // A. Mise à jour visuelle (DOM)
                    const bpmEl = document.getElementById('display_bpm1');
                    if(bpmEl) bpmEl.innerText = safeBpm;

                    // B. Mise à jour Variable Globale (Si elle existe)
                    if (typeof window.bpm !== 'undefined') window.bpm = safeBpm;
                    
                    // C. Tentative de mise à jour variable locale (Si accessible)
                    try { bpm = safeBpm; } catch(err) { /* Variable non accessible, pas grave */ }

                    console.log(`✅ BPM mis à jour : ${safeBpm} (Reçu: ${data.bpm})`);
                }

                // Swing
                if (typeof data.swing !== 'undefined') {
                    const swingSlider = document.getElementById('global-swing');
                    if(swingSlider) {
                        swingSlider.value = data.swing;
                        swingSlider.dispatchEvent(new Event('input')); // Force logic.js à lire la valeur
                    }
                }

                // Master Length & Polyrythmie
                if (data.masterLength) window.masterLength = data.masterLength;
                if (data.trackLengths) window.trackLengths = data.trackLengths;

                // --- 2. Données Séquenceur ---
                if (data.drums && data.drums.seq) window.drumSequences = data.drums.seq;
                if (data.drums && data.drums.accents) window.drumAccents = data.drums.accents;
                if (data.synths && data.synths.seq2) window.synthSequences.seq2 = data.synths.seq2;
                if (data.synths && data.synths.seq3) window.synthSequences.seq3 = data.synths.seq3;
                if (data.freqs2) window.freqDataSeq2 = data.freqs2;
                if (data.freqs3) window.freqDataSeq3 = data.freqs3;
                if (data.accents2 && window.synthAccents) window.synthAccents.seq2 = data.accents2;
                if (data.accents3 && window.synthAccents) window.synthAccents.seq3 = data.accents3;

                // --- 3. Actualisation Visuelle ---
                if (typeof refreshGridVisuals === 'function') refreshGridVisuals();
                if (typeof refreshFadersVisuals === 'function') {
                    refreshFadersVisuals(2);
                    if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
                }

                // Mise à jour des sliders de steps
                const stepSliders = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
                stepSliders.forEach((id, idx) => {
                    const el = document.getElementById(id);
                    if(el && window.trackLengths[idx]) el.value = window.trackLengths[idx];
                });

                alert(`Preset chargé ! BPM: ${data.bpm > 300 ? 300 : data.bpm}`);

            } catch (err) {
                console.error("❌ Erreur Import:", err);
                alert("Fichier invalide ou corrompu.");
            }
            
            event.target.value = ''; 
        };

        reader.readAsText(file);
    }
