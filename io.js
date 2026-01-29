/* ==========================================
   HARDBEAT PRO - IO SYSTEM (V13 FINAL PATCH)
   Correction ID: display-bpm1
   ========================================== */

const IO = {

    // 1. EXPORT (Sauvegarde)
    exportPreset: function() {
        try {
            console.log("💾 Export...");

            // --- CORRECTION CRUCIALE ICI (Tiret au lieu de Underscore) ---
            const bpmElement = document.getElementById('display-bpm1'); 
            
            // Si on ne trouve pas l'élément, on log l'erreur pour comprendre
            if (!bpmElement) console.error("⚠️ ERREUR: Impossible de trouver 'display-bpm1'");

            const currentBpm = bpmElement ? parseInt(bpmElement.innerText) : 120;

            const exportData = {
                name: "User Preset " + new Date().toLocaleTimeString(),
                version: "V13",
                bpm: currentBpm, 
                swing: parseInt(document.getElementById('global-swing').value),
                masterLength: window.masterLength || 16,
                trackLengths: window.trackLengths || [16,16,16,16,16],
                
                drums: {
                    seq: window.drumSequences || [],
                    accents: window.drumAccents || []
                },
                
                synths: {
                    seq2: window.synthSequences ? window.synthSequences.seq2 : [],
                    seq3: window.synthSequences ? window.synthSequences.seq3 : []
                },

                freqs2: window.freqDataSeq2 || [],
                freqs3: window.freqDataSeq3 || [],
                
                accents2: window.synthAccents ? window.synthAccents.seq2 : [],
                accents3: window.synthAccents ? window.synthAccents.seq3 : []
            };

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

        } catch (err) {
            alert("Erreur Export : " + err.message);
        }
    },


    // 2. IMPORT (Chargement)
    importPreset: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);

                // --- MISE À JOUR DU BPM (Avec le bon ID) ---
                if (data.bpm) {
                    const safeBpm = Math.min(Math.max(data.bpm, 40), 300);
                    
                    // On met à jour l'écran (C'est ça que le moteur lit !)
                    const bpmEl = document.getElementById('display-bpm1');
                    if(bpmEl) {
                        bpmEl.innerText = safeBpm;
                    } else {
                        console.error("⚠️ ERREUR IMPORT: 'display-bpm1' introuvable !");
                    }
                    
                    // On force aussi la variable globale au cas où
                    window.bpm = safeBpm;
                }

                // Swing
                if (typeof data.swing !== 'undefined') {
                    const el = document.getElementById('global-swing');
                    if(el) { el.value = data.swing; el.dispatchEvent(new Event('input')); }
                }

                // Restauration des données...
                if (data.masterLength) window.masterLength = data.masterLength;
                if (data.trackLengths) window.trackLengths = data.trackLengths;
                if (data.drums && data.drums.seq) window.drumSequences = data.drums.seq;
                if (data.drums && data.drums.accents) window.drumAccents = data.drums.accents;
                if (data.synths) {
                    if (data.synths.seq2) window.synthSequences.seq2 = data.synths.seq2;
                    if (data.synths.seq3) window.synthSequences.seq3 = data.synths.seq3;
                }
                if (data.freqs2) window.freqDataSeq2 = data.freqs2;
                if (data.freqs3) window.freqDataSeq3 = data.freqs3;
                if (data.accents2 && window.synthAccents) window.synthAccents.seq2 = data.accents2;
                if (data.accents3 && window.synthAccents) window.synthAccents.seq3 = data.accents3;

                // Refresh UI
                if (typeof refreshGridVisuals === 'function') refreshGridVisuals();
                if (typeof refreshFadersVisuals === 'function') {
                    refreshFadersVisuals(2);
                    if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
                }
                
                // Sliders
                const ids = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
                ids.forEach((id, i) => { 
                    const el = document.getElementById(id); 
                    if(el && window.trackLengths[i]) el.value = window.trackLengths[i]; 
                });

                alert(`Preset chargé ! BPM: ${data.bpm}`);

            } catch (err) {
                alert("Fichier invalide.");
            }
            event.target.value = ''; 
        };
        reader.readAsText(file);
    }
};
