/* ==========================================
   HARDBEAT PRO - IO SYSTEM (V13 Beta)
   Gère l'Import / Export des presets JSON
   Compatible avec logic.js V12
   ========================================== */

const IO = {

    // ------------------------------------------------------
    // 1. EXPORT : Sauvegarde l'état actuel
    // ------------------------------------------------------
    exportPreset: function() {
        try {
            console.log("💾 Export en cours...");

            // Récupération du BPM depuis l'affichage
            const bpmVal = parseInt(document.getElementById('bpm-display').innerText);
            
            // Récupération du Swing depuis le slider
            const swingVal = parseInt(document.getElementById('global-swing').value);

            const exportData = {
                name: "User Preset " + new Date().toLocaleTimeString(),
                version: "V13",
                bpm: bpmVal,
                swing: swingVal, // En pourcentage (0-100)
                masterLength: window.masterLength,
                trackLengths: window.trackLengths,
                
                // Drums
                drums: {
                    seq: window.drumSequences,
                    accents: window.drumAccents
                },
                
                // Synths
                synths: {
                    seq2: window.synthSequences.seq2,
                    seq3: window.synthSequences.seq3
                },

                // Fréquences (Les arrays plats de logic.js)
                freqs2: window.freqDataSeq2,
                freqs3: window.freqDataSeq3,
                
                // Accents Synths (Nouveau V12)
                accents2: window.synthAccents ? window.synthAccents.seq2 : [],
                accents3: window.synthAccents ? window.synthAccents.seq3 : []
            };

            // Conversion et Téléchargement
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `HARDBEAT_${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log("✅ Export terminé.");

        } catch (err) {
            console.error("❌ Erreur Export:", err);
            alert("Erreur export. Vérifiez la console.");
        }
    },


    // ------------------------------------------------------
    // 2. IMPORT : Charge le fichier et met à jour l'interface
    // ------------------------------------------------------
    importPreset: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                console.log("📂 Chargement:", data);

                // --- 1. Paramètres Globaux (Via UI pour être sûr) ---
                
                // BPM
                if (data.bpm) {
                    const safeBpm = Math.min(Math.max(data.bpm, 40), 300);
                    const bpmEl = document.getElementById('bpm-display');
                    if(bpmEl) bpmEl.innerText = safeBpm;
                }

                // Swing
                if (typeof data.swing !== 'undefined') {
                    const swingSlider = document.getElementById('global-swing');
                    if(swingSlider) {
                        swingSlider.value = data.swing;
                        // On déclenche l'événement 'input' pour que logic.js mette à jour la variable `globalSwing`
                        swingSlider.dispatchEvent(new Event('input'));
                    }
                }

                // Master Length
                if (data.masterLength) window.masterLength = data.masterLength;
                
                // Polyrhythm
                if (data.trackLengths) window.trackLengths = data.trackLengths;

                // --- 2. Données Séquenceur ---

                // Drums
                if (data.drums && data.drums.seq) window.drumSequences = data.drums.seq;
                if (data.drums && data.drums.accents) window.drumAccents = data.drums.accents;

                // Synths Sequences
                if (data.synths && data.synths.seq2) window.synthSequences.seq2 = data.synths.seq2;
                if (data.synths && data.synths.seq3) window.synthSequences.seq3 = data.synths.seq3;

                // Fréquences
                if (data.freqs2) window.freqDataSeq2 = data.freqs2;
                if (data.freqs3) window.freqDataSeq3 = data.freqs3;

                // Accents Synths
                if (data.accents2 && window.synthAccents) window.synthAccents.seq2 = data.accents2;
                if (data.accents3 && window.synthAccents) window.synthAccents.seq3 = data.accents3;

                // --- 3. Actualisation Visuelle ---
                
                // Met à jour la grille (LEDs)
                if (typeof refreshGridVisuals === 'function') {
                    refreshGridVisuals();
                }

                // Met à jour les faders de fréquence (SEQ 2)
                if (typeof refreshFadersVisuals === 'function') {
                    refreshFadersVisuals(2);
                    // Met à jour SEQ 3 seulement s'il est activé/visible
                    if(document.getElementById('grid-seq3')) {
                        refreshFadersVisuals(3);
                    }
                }

                // Met à jour les sliders de longueur de piste (Steps)
                // (Optionnel mais propre : remet les sliders visuels à jour)
                const stepSliders = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
                stepSliders.forEach((id, idx) => {
                    const el = document.getElementById(id);
                    if(el && window.trackLengths[idx]) el.value = window.trackLengths[idx];
                });

                alert("Preset chargé avec succès ! 🎹");

            } catch (err) {
                console.error("❌ Erreur Import:", err);
                alert("Fichier invalide ou corrompu.");
            }
            
            // Reset l'input file pour permettre de recharger le même fichier
            event.target.value = ''; 
        };

        reader.readAsText(file);
    }
};
