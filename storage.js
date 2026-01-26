/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE
   (Gère la sauvegarde, le chargement et l'UI des slots mémoire)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System: Initializing...");
    updateMemoryUI(); // Vérifie l'état des slots au démarrage

    // Gestion du bouton SAVE MODE
    const btnSave = document.getElementById('btn-save-mode');
    if(btnSave) {
        btnSave.onclick = () => {
            window.isSaveMode = !window.isSaveMode;
            btnSave.classList.toggle('saving', window.isSaveMode);
        };
    }

    // Gestion du bouton CLEAR
    const btnClear = document.getElementById('btn-clear-all');
    if(btnClear) {
        btnClear.onclick = () => {
            if(confirm("Effacer tout le pattern ?")) {
                clearAllData();
            }
        };
    }

    // Gestion des Slots 1-4
    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (window.isSaveMode) {
                savePattern(slot);
                btn.classList.add('flash-success'); 
                setTimeout(() => btn.classList.remove('flash-success'), 200);
                // On quitte le mode save après sauvegarde
                window.isSaveMode = false; 
                if(btnSave) btnSave.classList.remove('saving');
            } else {
                if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    loadPattern(slot);
                    btn.classList.add('flash-success'); 
                    setTimeout(() => btn.classList.remove('flash-success'), 200);
                }
            }
        };
    });
}

function clearAllData() {
    // Reset complet des données en mémoire
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    // Refresh visuel via logic.js
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
}

function savePattern(slot) {
    // Capture de l'état global
    const data = {
        version: "2.0",
        masterLength: window.masterLength,
        drums: {
            seq: window.drumSequences,
            accents: window.drumAccents,
            mutes: window.trackMutes,
            solos: window.trackSolos,
            lengths: window.trackLengths,
            settings: { 
                kick: { ...window.kickSettings, steps: document.getElementById('kick-steps').value },
                snare: { ...window.snareSettings, steps: document.getElementById('snare-steps').value },
                hhc: { ...window.hhSettings, steps: document.getElementById('hhc-steps').value },
                hho: { ...window.hhSettings, steps: document.getElementById('hho-steps').value },
                fm: { ...window.fmSettings, steps: document.getElementById('fm-steps').value }
            }
        },
        synths: {
            seq2: window.synthSequences.seq2,
            seq3: window.synthSequences.seq3,
            freqs2: window.freqDataSeq2,
            freqs3: window.freqDataSeq3,
            params2: window.paramsSeq2, 
            params3: window.paramsSeq3,
            mutes: { seq2: window.isMutedSeq2, seq3: window.isMutedSeq3 }, // Note: isMutedSeq vient de audio.js (global)
            vol2: document.getElementById('vol-seq2').value,
            vol3: document.getElementById('vol-seq3') ? document.getElementById('vol-seq3').value : 0.6,
        },
        global: {
            bpm1: document.getElementById('display-bpm1').innerText,
            bpm2: document.getElementById('display-bpm2').innerText,
            swing: document.getElementById('global-swing').value,
            accent: document.getElementById('global-accent-amount').value,
            delay: window.globalDelay
        }
    };
    
    localStorage.setItem(`hardbeat_pattern_${slot}`, JSON.stringify(data));
    updateMemoryUI();
    console.log(`Pattern ${slot} saved (64 Steps).`);
}

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    
    try {
        const data = JSON.parse(json);
        
        // --- RESTAURATION ---
        window.masterLength = data.masterLength || 16;
        document.querySelectorAll('.btn-length').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength);
        });
        if(window.updateNavButtonsState) window.updateNavButtonsState();

        // Drums
        if (data.drums.seq[0].length < 64) {
            window.drumSequences = data.drums.seq.map(row => [...row, ...Array(64 - row.length).fill(false)]);
            window.drumAccents = data.drums.accents.map(row => [...row, ...Array(64 - row.length).fill(false)]);
        } else {
            window.drumSequences = data.drums.seq;
            window.drumAccents = data.drums.accents;
        }
        window.trackMutes = data.drums.mutes;
        window.trackSolos = data.drums.solos;
        window.trackLengths = data.drums.lengths;

        // Sliders Helper
        const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };

        setSlider('kick-pitch', data.drums.settings.kick.pitch);
        setSlider('kick-decay', data.drums.settings.kick.decay);
        setSlider('kick-level', data.drums.settings.kick.level);
        setSlider('snare-tone', data.drums.settings.snare.tone);
        setSlider('snare-snappy', data.drums.settings.snare.snappy);
        setSlider('snare-level', data.drums.settings.snare.level);
        // ... (Tu peux ajouter les autres sliders ici si tu veux être exhaustif)

        // UI Mutes Drums
        document.querySelectorAll('.btn-mute').forEach((btn, i) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        // Synths
        if (data.synths.seq2.length < 64) {
            window.synthSequences.seq2 = [...data.synths.seq2, ...Array(64 - data.synths.seq2.length).fill(false)];
            window.synthSequences.seq3 = data.synths.seq3 ? [...data.synths.seq3, ...Array(64 - data.synths.seq3.length).fill(false)] : Array(64).fill(false);
        } else {
            window.synthSequences.seq2 = data.synths.seq2;
            window.synthSequences.seq3 = data.synths.seq3;
        }

        if (data.synths.freqs2.length < 64) {
             window.freqDataSeq2 = [...data.synths.freqs2, ...Array(64 - data.synths.freqs2.length).fill(440)];
             window.freqDataSeq3 = data.synths.freqs3 ? [...data.synths.freqs3, ...Array(64 - data.synths.freqs3.length).fill(440)] : Array(64).fill(440);
        } else {
            window.freqDataSeq2 = data.synths.freqs2;
            window.freqDataSeq3 = data.synths.freqs3;
        }

        // Params Synths
        setSlider('vol-seq2', data.synths.vol2);
        setSlider('synth2-disto', data.synths.params2.disto);
        setSlider('synth2-res', data.synths.params2.res);
        setSlider('synth2-cutoff', data.synths.params2.cutoff);
        setSlider('synth2-decay', data.synths.params2.decay);

        // Mutes Synths
        if(window.toggleMuteSynth) {
            window.toggleMuteSynth(2, data.synths.mutes.seq2);
            window.toggleMuteSynth(3, data.synths.mutes.seq3);
        }
        const btnMute2 = document.getElementById('btn-mute-seq2'); if(btnMute2) btnMute2.classList.toggle('active', data.synths.mutes.seq2);
        
        // Seq 3 Activation
        const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.some(f => f !== 440);
        const isSeq3Visible = document.getElementById('seq3-container');
        if ((hasSeq3Data || data.synths.mutes.seq3) && !isSeq3Visible) {
             const btnAdd = document.getElementById('add-seq-btn');
             if(btnAdd) btnAdd.click();
        }

        // Restauration retardée pour Seq 3 (le temps que le DOM se crée)
        setTimeout(() => {
             if(document.getElementById('seq3-container')) {
                 setSlider('vol-seq3', data.synths.vol3);
                 setSlider('synth3-disto', data.synths.params3.disto);
                 setSlider('synth3-res', data.synths.params3.res);
                 setSlider('synth3-cutoff', data.synths.params3.cutoff);
                 setSlider('synth3-decay', data.synths.params3.decay);
                 
                 const btnMute3 = document.getElementById('btn-mute-seq3'); if(btnMute3) btnMute3.classList.toggle('active', data.synths.mutes.seq3);
                 if(window.refreshFadersVisuals) window.refreshFadersVisuals(3);
             }
        }, 100);

        // Global
        document.getElementById('display-bpm1').innerText = data.global.bpm1;
        document.getElementById('display-bpm2').innerText = data.global.bpm2;
        setSlider('global-swing', data.global.swing); 
        setSlider('global-accent-amount', data.global.accent);
        setSlider('global-delay-amt', data.global.delay.amt);
        setSlider('global-delay-time', data.global.delay.time);

        // REFRESH VISUEL
        if(window.refreshGridVisuals) window.refreshGridVisuals();
        if(window.refreshFadersVisuals) window.refreshFadersVisuals(2);

    } catch (e) {
        console.error("Erreur Load:", e);
        alert("Fichier de sauvegarde incompatible.");
    }
}

function updateMemoryUI() {
    for (let i = 1; i <= 4; i++) {
        const slotBtn = document.querySelector(`.btn-mem-slot[data-slot="${i}"]`);
        if(slotBtn) {
            if (localStorage.getItem(`hardbeat_pattern_${i}`)) slotBtn.classList.add('has-data');
            else slotBtn.classList.remove('has-data');
        }
    }
}
