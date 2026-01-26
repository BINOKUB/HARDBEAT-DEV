/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE (V8 - DELETE FEATURE)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System V8: Right-click delete active.");
    updateMemoryUI(); 

    const btnSave = document.getElementById('btn-save-mode');
    if(btnSave) {
        btnSave.onclick = () => {
            window.isSaveMode = !window.isSaveMode;
            btnSave.classList.toggle('saving', window.isSaveMode);
        };
    }

    const btnClear = document.getElementById('btn-clear-all');
    if(btnClear) {
        btnClear.onclick = () => {
            if(confirm("Effacer la table de travail ? (Vos sauvegardes ne seront pas touchées)")) {
                clearAllData();
            }
        };
    }

    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        // --- CLIC GAUCHE (SAVE / LOAD) ---
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (window.isSaveMode) {
                // Mode Sauvegarde
                if(localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    if(!confirm(`Le Slot ${slot} contient déjà des données. Écraser ?`)) return;
                }
                savePattern(slot);
                btn.classList.add('flash-success'); 
                setTimeout(() => btn.classList.remove('flash-success'), 200);
                
                // On quitte le mode save auto pour éviter les accidents
                window.isSaveMode = false; 
                if(btnSave) btnSave.classList.remove('saving');
            } else {
                // Mode Chargement
                if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    loadPattern(slot);
                    btn.classList.add('flash-success'); 
                    setTimeout(() => btn.classList.remove('flash-success'), 200);
                } else {
                    // Slot vide -> Proposition de Nouveau Projet
                    if(confirm(`Le Slot ${slot} est vide. Voulez-vous vider la table de travail pour commencer un nouveau beat ici ?`)) {
                        clearAllData();
                        btn.style.backgroundColor = "#00f3ff";
                        btn.style.color = "#000";
                        setTimeout(() => { btn.style.backgroundColor = ""; btn.style.color = ""; }, 500);
                    }
                }
            }
        };

        // --- CLIC DROIT (SUPPRIMER LE SLOT) ---
        btn.oncontextmenu = (e) => {
            e.preventDefault(); // Empêche le menu contextuel du navigateur
            const slot = btn.dataset.slot;
            
            if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                if(confirm(`⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement le contenu du SLOT ${slot} ?`)) {
                    localStorage.removeItem(`hardbeat_pattern_${slot}`);
                    updateMemoryUI(); // La lumière verte va s'éteindre
                    console.log(`Slot ${slot} deleted.`);
                }
            }
        };
    });
}

function clearAllData() {
    // 1. Reset Memory
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    // 2. Reset Mutes
    window.isMutedSeq2 = false;
    window.isMutedSeq3 = false;
    const btnM2 = document.getElementById('btn-mute-seq2'); if(btnM2) btnM2.classList.remove('active');
    const btnM3 = document.getElementById('btn-mute-seq3'); if(btnM3) btnM3.classList.remove('active');
    
    // 3. Reset Global settings
    window.masterLength = 16;
    
    // 4. Update UI
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === 16); });
    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
}

function savePattern(slot) {
    const data = {
        version: "2.1",
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
}

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    try {
        const data = JSON.parse(json);
        
        window.masterLength = data.masterLength || 16;
        document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength); });
        if(window.updateNavButtonsState) window.updateNavButtonsState();

        window.drumSequences = (data.drums.seq[0].length < 64) ? data.drums.seq.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.seq;
        window.drumAccents = (data.drums.accents[0].length < 64) ? data.drums.accents.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.accents;
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

        document.querySelectorAll('.btn-mute').forEach((btn) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        window.synthSequences.seq2 = (data.synths.seq2.length < 64) ? [...data.synths.seq2, ...Array(64 - data.synths.seq2.length).fill(false)] : data.synths.seq2;
        window.synthSequences.seq3 = (data.synths.seq3 && data.synths.seq3.length < 64) ? [...data.synths.seq3, ...Array(64 - data.synths.seq3.length).fill(false)] : (data.synths.seq3 || Array(64).fill(false));
        
        window.freqDataSeq2 = (data.synths.freqs2.length < 64) ? [...data.synths.freqs2, ...Array(64 - data.synths.freqs2.length).fill(440)] : data.synths.freqs2;
        window.freqDataSeq3 = (data.synths.freqs3 && data.synths.freqs3.length < 64) ? [...data.synths.freqs3, ...Array(64 - data.synths.freqs3.length).fill(440)] : (data.synths.freqs3 || Array(64).fill(440));

        setSlider('vol-seq2', data.synths.vol2);
        setSlider('synth2-disto', data.synths.params2.disto);
        setSlider('synth2-res', data.synths.params2.res);
        setSlider('synth2-cutoff', data.synths.params2.cutoff);
        setSlider('synth2-decay', data.synths.params2.decay);

        const mutes = data.synths.mutes || { seq2: false, seq3: false };
        if(window.toggleMuteSynth) {
            window.toggleMuteSynth(2, mutes.seq2);
            window.toggleMuteSynth(3, mutes.seq3);
        }
        const btnMute2 = document.getElementById('btn-mute-seq2'); 
        if(btnMute2) btnMute2.classList.toggle('active', mutes.seq2);

        const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.some(f => f !== 440);
        const isSeq3Visible = document.getElementById('seq3-container');
        if ((hasSeq3Data || mutes.seq3) && !isSeq3Visible) {
             const btnAdd = document.getElementById('add-seq-btn'); if(btnAdd) btnAdd.click();
        }

        setTimeout(() => {
             if(document.getElementById('seq3-container')) {
                 setSlider('vol-seq3', data.synths.vol3);
                 setSlider('synth3-disto', data.synths.params3.disto);
                 setSlider('synth3-res', data.synths.params3.res);
                 setSlider('synth3-cutoff', data.synths.params3.cutoff);
                 setSlider('synth3-decay', data.synths.params3.decay);
                 
                 const btnMute3 = document.getElementById('btn-mute-seq3'); 
                 if(btnMute3) btnMute3.classList.toggle('active', mutes.seq3);
                 if(window.refreshFadersVisuals) window.refreshFadersVisuals(3);
             }
        }, 100);

        document.getElementById('display-bpm1').innerText = data.global.bpm1;
        setSlider('global-swing', data.global.swing); 
        setSlider('global-accent-amount', data.global.accent);
        setSlider('global-delay-amt', data.global.delay.amt);
        setSlider('global-delay-time', data.global.delay.time);

        if(window.refreshGridVisuals) window.refreshGridVisuals();
        if(window.refreshFadersVisuals) window.refreshFadersVisuals(2);

    } catch (e) {
        console.error(e);
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
