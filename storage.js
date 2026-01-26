/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE (WORKFLOW FIX)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System: Initializing...");
    updateMemoryUI(); 

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
            if(confirm("Effacer tout le pattern actuel ?")) {
                clearAllData();
            }
        };
    }

    // Gestion des Slots 1-4
    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            
            // --- MODE SAUVEGARDE ---
            if (window.isSaveMode) {
                if(localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    if(!confirm(`Le Slot ${slot} contient déjà un pattern. Écraser ?`)) {
                        return; // Annuler si l'utilisateur dit non
                    }
                }
                savePattern(slot);
                btn.classList.add('flash-success'); 
                setTimeout(() => btn.classList.remove('flash-success'), 200);
                window.isSaveMode = false; 
                if(btnSave) btnSave.classList.remove('saving');
            } 
            
            // --- MODE CHARGEMENT ---
            else {
                if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    // CAS 1 : Le slot contient des données -> ON CHARGE
                    loadPattern(slot);
                    btn.classList.add('flash-success'); 
                    setTimeout(() => btn.classList.remove('flash-success'), 200);
                } else {
                    // CAS 2 : Le slot est vide -> NOUVEAU PROJET
                    if(confirm(`Le Slot ${slot} est vide. Commencer un nouveau pattern ici ?`)) {
                        clearAllData(); // C'est ici que la magie opère !
                        // On donne un feedback visuel bleu pour dire "Nouveau"
                        btn.style.backgroundColor = "#00f3ff";
                        btn.style.color = "#000";
                        setTimeout(() => { btn.style.backgroundColor = ""; btn.style.color = ""; }, 500);
                    }
                }
            }
        };
    });
}

function clearAllData() {
    // 1. Reset Mémoire
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    // 2. Reset Paramètres (Optionnel - remet les sons par défaut)
    // On peut remettre le Master Length à 16 pour être propre
    window.masterLength = 16;
    
    // 3. Reset Interface
    // Met à jour les boutons Length
    document.querySelectorAll('.btn-length').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.length) === 16);
    });
    if(window.updateNavButtonsState) window.updateNavButtonsState();

    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    
    console.log("System Cleared (New Project).");
}

function savePattern(slot) {
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
            mutes: { seq2: window.isMutedSeq2, seq3: window.isMutedSeq3 },
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
    console.log(`Pattern ${slot} saved.`);
}

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    
    try {
        const data = JSON.parse(json);
        
        window.masterLength = data.masterLength || 16;
        document.querySelectorAll('.btn-length').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength);
        });
        if(window.updateNavButtonsState) window.updateNavButtonsState();

        // DRUMS
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

        const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };

        setSlider('kick-pitch', data.drums.settings.kick.pitch);
        setSlider('kick-decay', data.drums.settings.kick.decay);
        setSlider('kick-level', data.drums.settings.kick.level);
        setSlider('snare-tone', data.drums.settings.snare.tone);
        setSlider('snare-snappy', data.drums.settings.snare.snappy);
        setSlider('snare-level', data.drums.settings.snare.level);
        setSlider('hhc-tone', data.drums.settings.hhc.tone);
        setSlider('hhc-level', data.drums.settings.hhc.levelClose);
        setSlider('hho-decay', data.drums.settings.hho.decayOpen);
        setSlider('hho-level', data.drums.settings.hho.levelOpen);
        setSlider('fm-carrier', data.drums.settings.fm.carrierPitch);
        setSlider('fm-mod', data.drums.settings.fm.modPitch);
        setSlider('fm-amt', data.drums.settings.fm.fmAmount);
        setSlider('fm-decay', data.drums.settings.fm.decay);
        setSlider('fm-level', data.drums.settings.fm.level);

        document.querySelectorAll('.btn-mute').forEach((btn, i) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        // SYNTHS
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

        setSlider('vol-seq2', data.synths.vol2);
        setSlider('synth2-disto', data.synths.params2.disto);
        setSlider('synth2-res', data.synths.params2.res);
        setSlider('synth2-cutoff', data.synths.params2.cutoff);
        setSlider('synth2-decay', data.synths.params2.decay);

        if(window.toggleMuteSynth) {
            window.toggleMuteSynth(2, data.synths.mutes.seq2);
            window.toggleMuteSynth(3, data.synths.mutes.seq3);
        }
        const btnMute2 = document.getElementById('btn-mute-seq2'); if(btnMute2) btnMute2.classList.toggle('active', data.synths.mutes.seq2);
        
        const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.some(f => f !== 440);
        const isSeq3Visible = document.getElementById('seq3-container');
        if ((hasSeq3Data || data.synths.mutes.seq3) && !isSeq3Visible) {
             const btnAdd = document.getElementById('add-seq-btn');
             if(btnAdd) btnAdd.click();
        }

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

        document.getElementById('display-bpm1').innerText = data.global.bpm1;
        document.getElementById('display-bpm2').innerText = data.global.bpm2;
        setSlider('global-swing', data.global.swing); 
        setSlider('global-accent-amount', data.global.accent);
        setSlider('global-delay-amt', data.global.delay.amt);
        setSlider('global-delay-time', data.global.delay.time);

        if(window.refreshGridVisuals) window.refreshGridVisuals();
        if(window.refreshFadersVisuals) window.refreshFadersVisuals(2);

    } catch (e) {
        console.error("Load Error:", e);
        alert("Fichier incompatible.");
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
