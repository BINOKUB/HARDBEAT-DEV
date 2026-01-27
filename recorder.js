/* ==========================================
   HARDBEAT PRO - WAV RECORDER (V3 - FINAL FIX)
   ========================================== */

let isRecording = false;
let recorderNode = null;
let recordingData = [[], []]; 
let sampleRate = 44100;

function initRecorder() {
    console.log("WAV Recorder: Ready.");
    const btnRec = document.getElementById('btn-rec');
    if (!btnRec) return;

    btnRec.onclick = () => {
        if (!isRecording) {
            startRecording(btnRec); // On passe bien le bouton en argument
        } else {
            stopRecording(btnRec);
        }
    };
}

function startRecording(btn) {
    if (!window.audioCtx || !window.masterGain) {
        console.error("Recorder Error: AudioCtx missing.");
        return;
    }
    
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

    recordingData = [[], []];
    sampleRate = window.audioCtx.sampleRate;

    // Capture
    recorderNode = window.audioCtx.createScriptProcessor(4096, 2, 2);
    
    recorderNode.onaudioprocess = (e) => {
        if (!isRecording) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        recordingData[0].push(new Float32Array(left));
        recordingData[1].push(new Float32Array(right));
    };

    window.masterGain.connect(recorderNode);
    recorderNode.connect(window.audioCtx.destination);

    isRecording = true;
    
    // CORRECTION : On utilise 'btn' ici (et pas btnRec)
    btn.classList.add('recording');
    btn.innerText = "REC ●"; 
}

function stopRecording(btn) {
    if (!isRecording) return;

    isRecording = false;
    
    if (recorderNode) {
        recorderNode.disconnect();
        recorderNode = null;
    }

    btn.classList.remove('recording');
    btn.innerText = "WAIT..."; 

    setTimeout(() => {
        exportWav();
        btn.innerText = "REC"; 
    }, 100);
}

function exportWav() {
    const leftBuffer = mergeBuffers(recordingData[0]);
    const rightBuffer = mergeBuffers(recordingData[1]);
    const interleaved = interleave(leftBuffer, rightBuffer);
    const buffer = new ArrayBuffer(44 + interleaved.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, 2, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); 
    view.setUint16(32, 4, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    floatTo16BitPCM(view, 44, interleaved);

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `hardbeat_track_${timestamp}.wav`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function mergeBuffers(recBuffers) {
    let length = 0;
    recBuffers.forEach(b => length += b.length);
    let result = new Float32Array(length);
    let offset = 0;
    recBuffers.forEach(buffer => { result.set(buffer, offset); offset += buffer.length; });
    return result;
}

function interleave(inputL, inputR) {
    let length = inputL.length + inputR.length;
    let result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) { result[index++] = inputL[inputIndex]; result[index++] = inputR[inputIndex]; inputIndex++; }
    return result;
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
}

window.addEventListener('load', () => { setTimeout(initRecorder, 500); });
