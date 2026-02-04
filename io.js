/* ==========================================
   HARDBEAT PRO - IO SYSTEM (V20 - STEPS FIX)
   Export/Import de fichiers .json AVEC FIX STEPS & SOLOS
   ========================================== */

const IO = {

    // 1. EXPORT (Sauvegarde Fichier sur l'ordi)
    exportPreset: function() {
        try {
            console.log("💾 Exporting Full State (With Steps Fix)...");

            const bpmElement = document.getElementById('display-bpm1'); 
            const currentBpm = bpmElement ? parseInt(bpmElement.innerText) : 120;

            // ON CAPTURE L'ETAT COMPLET
            const exportData = {
                name: "User Preset " + new Date().toLocaleTimeString(),
                version: "V20", 
                
                // GLOBAL
                global: {
                    len: window.masterLength || 16,
                    trackLens: [...window.trackLengths], // On garde ce nom car c'est celui utilisé par le Générateur aussi
                    bpm: currentBpm,
                    swing: parseInt(document.getElementById('global-swing').value)
                },

                // REGLAGES AUDIOS COMPLETS
                controls: {
                    isChordMode: window.isChordModeSeq3, 
                    delay: parseFloat(document.getElementById('global-delay-amt').value) || 0,
                    
                    // Synthés
                    s2: { ...window.paramsSeq2, vol: window.synthVol2 }, 
                    s3: { ...window.paramsSeq3, vol: window.synthVol3 },

                    // Drums
                    kick: { ...window.kickSettings },
                    snare: { ...window.snareSettings },
                    hh: { ...window.hhSettings },
                    fm: { ...window.fmSettings }
                },

                // DRUMS PATTERNS
                drums: {
                    seq: window.drumSequences.map(s => [...s]),
                    acc: window.drumAccents.map(s => [...s])
                },
                
                // SYNTHS PATTERNS
                synths: {
                    seq2: [...window.synthSequences.seq2],
                    seq3: [...window.synthSequences.seq3],
                    acc2: window.synthAccents.seq2 ? [...window.synthAccents.seq2] : Array(64).fill(false),
                    acc3: window.synthAccents.seq3 ? [...window.synthAccents.seq3] : Array(64).fill(false)
                },

                // FREQUENCES MELODIQUES + FM FREQS
                freqs: {
                    seq2: [...window.freqDataSeq2],
                    seq3: [...window.freqDataSeq3],
                    fm: window.fmFreqData ? [...window.fmFreqData] : []
                },

                // ACCORDS SEQ 3
                chords: {
                    qual: [...window.chordQualitySeq3]
                },

                // MIXAGE (AJOUT DES SOLOS ICI POUR ETRE COHERENT AVEC LOGIC.JS)
                mutes: [...window.trackMutes],
                solos: [...window.trackSolos] 
            };

            // Création et téléchargement
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
            link.download = `HARDBEAT_PRESET_${dateStr}_${Date.now().toString().slice(-4)}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log("✅ Export réussi (Steps & Solos inclus) !");

        } catch (err) {
            console.error(err);
            alert("Erreur Export : " + err.message);
        }
    },


    // 2. IMPORT (Chargement Fichier depuis l'ordi)
    importPreset: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                console.log("📂 Loading Preset:", data.version);

                // HELPER
                const forceUpdateKnob = (id, val, updateFunc) => {
                    const el = document.getElementById(id);
                    if (el && typeof val === 'number') {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if(updateFunc) updateFunc(val);
                };

                // 1. DETACHER LE SLOT MEMOIRE
                if(window.currentMemorySlot !== undefined) {
                    window.currentMemorySlot = -1;
                    if(typeof updateMemoryVisuals === 'function') updateMemoryVisuals();
                }

                // 2. RESTAURATION GLOBALE
                const bpm = data.global ? data.global.bpm : data.bpm;
                if(bpm) {
                     const safeBpm = Math.min(Math.max(bpm, 40), 300);
                     const bpmEl = document.getElementById('display-bpm1');
                     if(bpmEl) bpmEl.innerText = safeBpm;
                }

                const len = data.global ? data.global.len : data.masterLength;
                if(len) {
                    window.masterLength = len;
                    document.querySelectorAll('.btn-length').forEach(b => 
                        b.classList.toggle('active', b.dataset.length == window.masterLength)
                    );
                }

                // --- CORRECTIF MAJOR : STEPS (TRACK LENGTHS) ---
                if(data.global) {
                    // On vérifie les deux noms possibles
                    if(data.global.trackLengths) {
                        window.trackLengths = [...data.global.trackLengths];
                    } 
                    else if(data.global.trackLens) { // <--- C'EST ICI QUE CA BLOQUAIT
                        window.trackLengths = [...data.global.trackLens];
                    }
                } 
                else if(data.trackLengths) {
                    window.trackLengths = [...data.trackLengths];
                }

                const swingVal = (data.global && data.global.swing !== undefined) ? data.global.swing : data.swing;
                if(swingVal !== undefined) {
                    const el = document.getElementById('global-swing');
                    if(el) { el.value = swingVal; el.dispatchEvent(new Event('input')); }
                }

                // 3. RESTAURATION CONTROLES
                if (data.controls) {
                    // CHORD MODE
                    window.isChordModeSeq3 = data.controls.isChordMode;
                    const btnChord = document.getElementById('btn-chord-seq3');
                    if(btnChord) {
                        if(window.isChordModeSeq3) {
                             btnChord.innerText = "CHORD: ON"; btnChord.style.background = "#a855f7"; btnChord.style.color = "#000";
                        } else {
                             btnChord.innerText = "CHORD: OFF"; btnChord.style.background = "transparent"; btnChord.style.color = "#a855f7";
                        }
                    }

                    // SYNTH 2
                    if(data.controls.s2) {
                        window.paramsSeq2 = { ...data.controls.s2 };
                        window.synthVol2 = data.controls.s2.vol;
                        forceUpdateKnob('synth2-disto', window.paramsSeq2.disto);
                        forceUpdateKnob('synth2-res', window.paramsSeq2.res);
                        forceUpdateKnob('synth2-cutoff', window.paramsSeq2.cutoff);
                        forceUpdateKnob('synth2-decay', window.paramsSeq2.decay);
                        forceUpdateKnob('vol-seq2', window.synthVol2);
                    }
                    // SYNTH 3
                    if(data.controls.s3) {
                        window.paramsSeq3 = { ...data.controls.s3 };
                        window.synthVol3 = data.controls.s3.vol;
                        forceUpdateKnob('synth3-disto', window.paramsSeq3.disto);
                        forceUpdateKnob('synth3-res', window.paramsSeq3.res);
                        forceUpdateKnob('synth3-cutoff', window.paramsSeq3.cutoff);
                        forceUpdateKnob('synth3-decay', window.paramsSeq3.decay);
                        forceUpdateKnob('vol-seq3', window.synthVol3);
                    }
                    // DELAY
                    if(data.controls.delay !== undefined) {
                        forceUpdateKnob('global-delay-amt', data.controls.delay);
                    }

                    // DRUMS
                    if(data.controls.kick) {
                        window.kickSettings = { ...data.controls.kick };
                        forceUpdateKnob('kick-pitch', window.kickSettings.pitch);
                        forceUpdateKnob('kick-decay', window.kickSettings.decay);
                        forceUpdateKnob('kick-level', window.kickSettings.level);
                        // RUMBLE (Via Module)
                        if(window.kickSettings.rumble !== undefined) {
                             forceUpdateKnob('kick-rumble-amount', window.kickSettings.rumble);
                        }
                    }
                    if(data.controls.snare) {
                        window.snareSettings = { ...data.controls.snare };
                        forceUpdateKnob('snare-tone', window.snareSettings.tone);
                        forceUpdateKnob('snare-snappy', window.snareSettings.snappy);
                        forceUpdateKnob('snare-level', window.snareSettings.level);
                    }
                    if(data.controls.hh) {
                        window.hhSettings = { ...data.controls.hh };
                        forceUpdateKnob('hhc-tone', window.hhSettings.tone);
                        forceUpdateKnob('hhc-level', window.hhSettings.levelClose);
                        forceUpdateKnob('hho-decay', window.hhSettings.decayOpen);
                        forceUpdateKnob('hho-level', window.hhSettings.levelOpen);
                    }
                    if(data.controls.fm) {
                        window.fmSettings = { ...data.controls.fm };
                        forceUpdateKnob('fm-carrier', window.fmSettings.carrierPitch);
                        forceUpdateKnob('fm-mod', window.fmSettings.modPitch);
                        forceUpdateKnob('fm-amt', window.fmSettings.fmAmount);
                        forceUpdateKnob('fm-decay', window.fmSettings.decay);
                        forceUpdateKnob('fm-level', window.fmSettings.level);
                    }
                }

                // 4. SEQUENCES
                if (data.drums && data.drums.seq) window.drumSequences = data.drums.seq.map(s => [...s]);
                if (data.drums && data.drums.acc) window.drumAccents = data.drums.acc.map(s => [...s]);
                else if (data.drums && data.drums.accents) window.drumAccents = data.drums.accents.map(s => [...s]);

                if (data.synths) {
                    if (data.synths.seq2) window.synthSequences.seq2 = [...data.synths.seq2];
                    if (data.synths.seq3) window.synthSequences.seq3 = [...data.synths.seq3];
                    if (data.synths.acc2) window.synthAccents.seq2 = [...data.synths.acc2];
                    if (data.synths.acc3) window.synthAccents.seq3 = [...data.synths.acc3];
                }

                // 5. FREQUENCES
                if (data.freqs) {
                    if (data.freqs.seq2) window.freqDataSeq2 = [...data.freqs.seq2];
                    if (data.freqs.seq3) window.freqDataSeq3 = [...data.freqs.seq3];
                    if (data.freqs.fm) window.fmFreqData = [...data.freqs.fm];
                } else {
                    if (data.freqs2) window.freqDataSeq2 = [...data.freqs2];
                    if (data.freqs3) window.freqDataSeq3 = [...data.freqs3];
                    if (data.drums && data.drums.fmFreqs) window.fmFreqData = [...data.drums.fmFreqs];
                }

                // 6. MUTES & SOLOS & CHORDS
                if (data.chords && data.chords.qual) window.chordQualitySeq3 = [...data.chords.qual];
                
                if(data.mutes) {
                    window.trackMutes = [...data.mutes];
                    document.querySelectorAll('.btn-mute').forEach((btn, i) => {
                        if(i < 5) btn.classList.toggle('active', window.trackMutes[i]);
                    });
                }

                // RESTAURATION SOLOS (Ajouté aussi)
                if(data.solos) {
                    window.trackSolos = [...data.solos];
                } else {
                    window.trackSolos = [false, false, false, false, false];
                }
                document.querySelectorAll('.btn-solo').forEach((btn, i) => {
                    if(i < 5) btn.classList.toggle('active', window.trackSolos[i]);
                });

                // REFRESH VISUEL STEPS (C'est ça qui va se mettre à jour correctement maintenant)
                const ids = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
                ids.forEach((id, i) => { 
                    const el = document.getElementById(id); 
                    if(el && window.trackLengths[i]) el.value = window.trackLengths[i]; 
                });

                if(typeof currentPageSeq1 !== 'undefined') { currentPageSeq1 = 0; currentPageSeq2 = 0; currentPageSeq3 = 0; }
                if(document.getElementById('page-indicator-seq1')) updatePageIndicator('seq1');
                if(document.getElementById('page-indicator-seq2')) updatePageIndicator('seq2');
                if(document.getElementById('page-indicator-seq3')) updatePageIndicator('seq3');

                refreshGridVisuals();
                refreshFadersVisuals(2);
                if(document.getElementById('grid-seq3')) refreshFadersVisuals(3);
                if(typeof refreshFMFaders === 'function') refreshFMFaders();

                console.log("✅ Import Réussi (Total Recall + Steps Fix).");

            } catch (err) {
                console.error(err);
                alert("Fichier invalide ou corrompu.");
            }
            event.target.value = ''; 
        };
        reader.readAsText(file);
    }
};
