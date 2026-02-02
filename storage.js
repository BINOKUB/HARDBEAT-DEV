/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE (V11 - FACTORY LOAD FIX)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System V11: Ready.");
    updateMemoryUI(); 

    // GESTION DES PRESETS FACTORY
    const presetSelector = document.getElementById('preset-selector');
    if (presetSelector) {
        presetSelector.onchange = (e) => {
            const key = e.target.value;
            if (key && FACTORY_PRESETS[key]) {
                if(confirm(`Charger le preset "${FACTORY_PRESETS[key].name}" ? \nCela effacera votre travail non sauvegardé.`)) {
                    loadFactoryPreset(key);
                }
                e.target.value = ""; 
            }
        };
    }

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
        // CLIC GAUCHE (SAVE/LOAD)
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (window.isSaveMode) {
                if(localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    if(!confirm(`Écraser le Slot ${slot} ?`)) return;
                }
                savePattern(slot);
                btn.classList.add('flash-success'); 
                setTimeout(() => btn.classList.remove('flash-success'), 200);
                window.isSaveMode = false; 
                if(btnSave) btnSave.classList.remove('saving');
            } else {
                if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    loadPattern(slot);
                    btn.classList.add('flash-success'); 
                    setTimeout(() => btn.classList.remove('flash-success'), 200);
                } else {
                    if(confirm(`Slot ${slot} vide. Créer nouveau projet ?`)) {
                        clearAllData();
                        btn.style.backgroundColor = "#00f3ff";
                        btn.style.color = "#000";
                        setTimeout(() => { btn.style.backgroundColor = ""; btn.style.color = ""; }, 500);
                    }
                }
            }
        };

        // CLIC DROIT (DELETE)
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            const slot = btn.dataset.slot;
            if (localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                if(confirm(`⚠️ Supprimer définitivement le SLOT ${slot} ?`)) {
                    localStorage.removeItem(`hardbeat_pattern_${slot}`);
                    updateMemoryUI();
                }
            }
        };
    });
}

function clearAllData() {
    // RESET MEMOIRE
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    
    // Reset Synths
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    // Reset FM Freqs
    if(window.fmFreqData) window.fmFreqData.fill(100);
    
    // RESET MUTES
    window.isMutedSeq2 = false;
    window.isMutedSeq3 = false;
    const btnM2 = document.getElementById('btn-mute-seq2'); if(btnM2) btnM2.classList.remove('active');
    const btnM3 = document.getElementById('btn-mute-seq3'); if(btnM3) btnM3.classList.remove('active');
    
    // RESET LENGTH
    window.masterLength = 16;
    
    // RESET UI
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === 16); });
    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    
    // RESET FADERS VISUELS
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    // RESET FADERS FM
    if(window.refreshFMFaders) window.refreshFMFaders();
}

function savePattern(slot) {
    const data = {
        version: "2.3", 
        masterLength: window.masterLength,
        drums: {
            seq: window.drumSequences,
            accents: window.drumAccents,
            fmFreqs: window.fmFreqData, 
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
        
        // Load FM Data
        if (data.drums.fmFreqs) {
            window.fmFreqData = data.drums.fmFreqs.map(v => parseFloat(v));
            if (window.fmFreqData.length < 64) {
                window.fmFreqData = [...window.fmFreqData, ...Array(64 - window.fmFreqData.length).fill(100)];
            }
        } else {
            if(window.fmFreqData) window.fmFreqData.fill(100);
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

        document.querySelectorAll('.btn-mute').forEach((btn) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        window.synthSequences.seq2 = (data.synths.seq2.length < 64) ? [...data.synths.seq2, ...Array(64 - data.synths.seq2.length).fill(false)] : data.synths.seq2;
        window.synthSequences.seq3 = (data.synths.seq3 && data.synths.seq3.length < 64) ? [...data.synths.seq3, ...Array(64 - data.synths.seq3.length).fill(false)] : (data.synths.seq3 || Array(64).fill(false));
        
        if (data.synths.freqs2 && data.synths.freqs2.length > 0) {
            window.freqDataSeq2 = data.synths.freqs2.map(v => parseFloat(v));
            if (window.freqDataSeq2.length < 64) window.freqDataSeq2 = [...window.freqDataSeq2, ...Array(64 - window.freqDataSeq2.length).fill(440)];
        } else window.freqDataSeq2.fill(440);

        if (data.synths.freqs3 && data.synths.freqs3.length > 0) {
            window.freqDataSeq3 = data.synths.freqs3.map(v => parseFloat(v));
            if (window.freqDataSeq3.length < 64) window.freqDataSeq3 = [...window.freqDataSeq3, ...Array(64 - window.freqDataSeq3.length).fill(440)];
        } else window.freqDataSeq3.fill(440);

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
        if(window.refreshFMFaders) window.refreshFMFaders();

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

// ⚠️ C'EST ICI LA CORRECTION PRINCIPALE ⚠️
function loadFactoryPreset(key) {
    const p = FACTORY_PRESETS[key];
    if(!p) return;

    // 1. Reset Clean
    clearAllData();

    // 2. Load Data from Preset
    window.masterLength = p.masterLength;
    document.getElementById('display-bpm1').innerText = p.bpm;
    document.getElementById('display-bpm2').innerText = p.bpm; // Sync
    
    // Sliders Global
    const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
    setSlider('global-swing', p.swing);

    // Track Lengths
    if(p.trackLengths) {
        window.trackLengths = [...p.trackLengths]; // Clone
        setSlider('kick-steps', p.trackLengths[0]);
        setSlider('snare-steps', p.trackLengths[1]);
        setSlider('hhc-steps', p.trackLengths[2]);
        setSlider('hho-steps', p.trackLengths[3]);
        setSlider('fm-steps', p.trackLengths[4]);
    }

    // Drums
    for(let i=0; i<5; i++) {
        window.drumSequences[i] = [...p.drums.seq[i], ...Array(64-p.drums.seq[i].length).fill(false)];
        if(p.drums.accents[i]) window.drumAccents[i] = [...p.drums.accents[i], ...Array(64-p.drums.accents[i].length).fill(false)];
    }

    // --- CORRECTION : CHARGEMENT DES FREQUENCES FM (DRUMS) ---
    // Le code généré par le Generator V6 met les données dans p.drums.fmFreqs
    if (p.drums && p.drums.fmFreqs) {
        // On copie les données dans la mémoire vive
        window.fmFreqData = [...p.drums.fmFreqs];
        
        // Sécurité : On s'assure qu'on a bien 64 valeurs
        if (window.fmFreqData.length < 64) {
             window.fmFreqData = [...window.fmFreqData, ...Array(64 - window.fmFreqData.length).fill(100)];
        }
    } else {
        // Si le preset est ancien (V4/V5), on met tout à 100Hz
        window.fmFreqData.fill(100);
    }
    // ---------------------------------------------------------

    // Synths
    if(p.synths.seq2) window.synthSequences.seq2 = [...p.synths.seq2, ...Array(64-p.synths.seq2.length).fill(false)];
    if(p.synths.seq3) window.synthSequences.seq3 = [...p.synths.seq3, ...Array(64-p.synths.seq3.length).fill(false)];

    // Freqs
    if(p.freqs2) window.freqDataSeq2 = [...p.freqs2];
    else if(p.freqs && p.freqs.s2) window.freqDataSeq2.fill(p.freqs.s2); 
    
    if(p.freqs3) window.freqDataSeq3 = [...p.freqs3];
    else if(p.freqs && p.freqs.s3) window.freqDataSeq3.fill(p.freqs.s3); 
    
    // Accents Synths
    if(p.accents2) window.synthAccents.seq2 = [...p.accents2];
    if(p.accents3) window.synthAccents.seq3 = [...p.accents3];

    // Update UI
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength); });
    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    
    // --- REFRESH DES FADERS FM (IMPORTANT) ---
    if(window.refreshFMFaders) window.refreshFMFaders();
    
    // Si Seq 3 utilisé dans le preset
    const seq3Used = p.synths.seq3.some(x => x === true);
    const isSeq3Visible = document.getElementById('seq3-container');
    if (seq3Used && !isSeq3Visible) {
         const btnAdd = document.getElementById('add-seq-btn'); if(btnAdd) btnAdd.click();
    }

    console.log(`Preset ${p.name} loaded.`);
}
