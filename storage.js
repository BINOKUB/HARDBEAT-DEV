/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE (V7 - MUTE FIX)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System V7: Init...");
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
        btnClear.onclick = () => { if(confirm("Effacer tout ?")) clearAllData(); };
    }

    document.querySelectorAll('.btn-mem-slot').forEach(btn => {
        btn.onclick = () => {
            const slot = btn.dataset.slot;
            if (window.isSaveMode) {
                if(localStorage.getItem(`hardbeat_pattern_${slot}`)) {
                    if(!confirm(`Écraser Slot ${slot} ?`)) return;
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
                    if(confirm(`Slot ${slot} vide. Créer nouveau ?`)) {
                        clearAllData();
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
    // 1. Reset Memory
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    // 2. Reset Mutes (CRUCIAL FIX)
    window.isMutedSeq2 = false;
    window.isMutedSeq3 = false;
    // Reset Boutons Mute UI
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
    console.log("System Cleared & Mutes Reset.");
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
            // Maintenant isMutedSeq2 est bien accessible via window
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
        
        // Globals
        window.masterLength = data.masterLength || 16;
        document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength); });
        if(window.updateNavButtonsState) window.updateNavButtonsState();

        // Drums
        window.drumSequences = (data.drums.seq[0].length < 64) ? data.drums.seq.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.seq;
        window.drumAccents = (data.drums.accents[0].length < 64) ? data.drums.accents.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.accents;
        window.trackMutes = data.drums.mutes;
        window.trackSolos = data.drums.solos;
        window.trackLengths = data.drums.lengths;

        const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
        setSlider('kick-pitch', data.drums.settings.kick.pitch);
        setSlider('kick-decay', data.drums.settings.kick.decay);
        setSlider('kick-level', data.drums.settings.kick.level);
        // ... (autres settings drums) ...

        document.querySelectorAll('.btn-mute').forEach((btn) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        // Synths
        window.synthSequences.seq2 = (data.synths.seq2.length < 64) ? [...data.synths.seq2, ...Array(64 - data.synths.seq2.length).fill(false)] : data.synths.seq2;
        window.synthSequences.seq3 = (data.synths.seq3 && data.synths.seq3.length < 64) ? [...data.synths.seq3, ...Array(64 - data.synths.seq3.length).fill(false)] : (data.synths.seq3 || Array(64).fill(false));
        
        window.freqDataSeq2 = (data.synths.freqs2.length < 64) ? [...data.synths.freqs2, ...Array(64 - data.synths.freqs2.length).fill(440)] : data.synths.freqs2;
        window.freqDataSeq3 = (data.synths.freqs3 && data.synths.freqs3.length < 64) ? [...data.synths.freqs3, ...Array(64 - data.synths.freqs3.length).fill(440)] : (data.synths.freqs3 || Array(64).fill(440));

        setSlider('vol-seq2', data.synths.vol2);
        setSlider('synth2-disto', data.synths.params2.disto);
        setSlider('synth2-res', data.synths.params2.res);
        setSlider('synth2-cutoff', data.synths.params2.cutoff);
        setSlider('synth2-decay', data.synths.params2.decay);

        // RESTAURATION MUTES SYNTHS (CORRECTED)
        const mutes = data.synths.mutes || { seq2: false, seq3: false };
        if(window.toggleMuteSynth) {
            window.toggleMuteSynth(2, mutes.seq2);
            window.toggleMuteSynth(3, mutes.seq3);
        }
        const btnMute2 = document.getElementById('btn-mute-seq2'); 
        if(btnMute2) btnMute2.classList.toggle('active', mutes.seq2);

        // Seq 3 UI
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
