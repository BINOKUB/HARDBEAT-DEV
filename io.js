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

            // --- CORRECTION ID BPM ---
            // On vérifie si l'élément existe avant de lire son texte
            const bpmElement = document.getElementById('display_bpm1');
            const bpmVal = bpmElement ? parseInt(bpmElement.innerText) : 120; 

            // Récupération du Swing
            const swingElement = document.getElementById('global-swing');
            const swingVal = swingElement ? parseInt(swingElement.value) : 0;

            const exportData = {
                name: "User Preset " + new Date().toLocaleTimeString(),
                version: "V13",
                bpm: bpmVal,
                swing: swingVal,
                masterLength: (typeof window.masterLength !== 'undefined') ? window.masterLength : 16,
                trackLengths: (typeof window.trackLengths !== 'undefined') ? window.trackLengths : [16,16,16,16,16],
                
                drums: {
                    seq: (typeof window.drumSequences !== 'undefined') ? window.drumSequences : [],
                    accents: (typeof window.drumAccents !== 'undefined') ? window.drumAccents : []
                },
                
                synths: {
                    seq2: (window.synthSequences) ? window.synthSequences.seq2 : [],
                    seq3: (window.synthSequences) ? window.synthSequences.seq3 : []
                },

                freqs2: window.freqDataSeq2 || [],
                freqs3: window.freqDataSeq3 || [],
                
                accents2: (window.synthAccents) ? window.synthAccents.seq2 : [],
                accents3: (window.synthAccents) ? window.synthAccents.seq3 : []
            };

            // Création du fichier
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
            alert("Erreur technique export : " + err.message);
        }
    },


    // ------------------------------------------------------
    // 2. IMPORT : Version Force Brute (Met à jour le moteur)
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
                
                // BPM : Mise à jour TOTALE (Écran + Moteur + Variable)
                if (data.bpm) {
                    const safeBpm = Math.min(Math.max(data.bpm, 40), 300);
                    
                    // A. Écran
                    const bpmEl = document.getElementById('display_bpm1');
                    if(bpmEl) bpmEl.innerText = safeBpm;

                    // B. Variable Globale (Si accessible)
                    if (typeof window.bpm !== 'undefined') window.bpm = safeBpm;
                    
                    // C. Variable locale (Essai)
                    try { bpm = safeBpm; } catch(err) { }
                }

                // Swing
                if (typeof data.swing !== 'undefined') {
                    const swingSlider = document.getElementById('global-swing');
                    if(swingSlider) {
                        swingSlider.value = data.swing;
                        swingSlider.dispatchEvent(new Event('input')); // Force la mise à jour
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

                // Sliders de steps
                const stepSliders = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
                stepSliders.forEach((id, idx) => {
                    const el = document.getElementById(id);
                    if(el && window.trackLengths[idx]) el.value = window.trackLengths[idx];
                });

                alert(`Preset chargé ! BPM: ${data.bpm}`);

            } catch (err) {
                console.error("❌ Erreur Import:", err);
                alert("Fichier invalide ou corrompu.");
            }
            
            event.target.value = ''; 
        };

        reader.readAsText(file);
    }
};
