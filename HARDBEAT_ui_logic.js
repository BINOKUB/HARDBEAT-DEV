/* --- SYNTH INTERACTION LOGIC --- */

// Clics sur les Pads du Synthé
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (!pad) return;
    const container = pad.parentElement;
    const stepIndex = parseInt(pad.dataset.index);

    if (container.id === 'grid-seq2' || container.id === 'grid-seq3') {
        const isSeq2 = (container.id === 'grid-seq2');
        const targetSeq = isSeq2 ? synthSequences.seq2 : synthSequences.seq3;
        const color = isSeq2 ? "#00f3ff" : "#7000ff";

        targetSeq[stepIndex] = !targetSeq[stepIndex];
        pad.classList.toggle('active');
        const led = pad.querySelector('.led');
        led.style.background = targetSeq[stepIndex] ? color : "#330000";
        led.style.boxShadow = targetSeq[stepIndex] ? `0 0 10px ${color}` : "none";
    }
});

// Liaisons des Sliders de Master Synth
window.addEventListener('DOMContentLoaded', () => {
    const bindId = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el[event] = fn;
    };

    bindId('synth-disto', 'oninput', (e) => {
        synthParams.disto = parseFloat(e.target.value);
        distortionNode.curve = createDistortionCurve(synthParams.disto);
    });

    bindId('synth-res', 'oninput', (e) => synthParams.resonance = parseFloat(e.target.value));
    bindId('synth-cutoff', 'oninput', (e) => synthParams.cutoffEnv = parseFloat(e.target.value));
    
    bindId('synth-delay-amt', 'oninput', (e) => {
        synthParams.delayAmt = parseFloat(e.target.value);
        delayMix.gain.setValueAtTime(synthParams.delayAmt, audioCtx.currentTime);
        feedback.gain.setValueAtTime(synthParams.delayAmt * 0.7, audioCtx.currentTime);
    });

    bindId('synth-delay-time', 'oninput', (e) => {
        synthParams.delayTime = parseFloat(e.target.value);
        delayNode.delayTime.setTargetAtTime(synthParams.delayTime, audioCtx.currentTime, 0.1);
    });
});
