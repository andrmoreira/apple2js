const CPU_HZ = 1_022_727; // NTSC Apple II CPU clock in Hz
const SPEAKER_LEVEL = 0.12;
const BUFFER_SIZE = 1024;

export class SpeakerAudio {
    context=null;
    node=null;
    state=0;
    samples=[];
    readIndex=0;
    cycleRemainder=0;

    start() {
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            this.node = this.context.createScriptProcessor(BUFFER_SIZE, 0, 1);

            this.node.onaudioprocess = (event) => {
                const output = event.outputBuffer.getChannelData(0);

                for (let i=0; i < output.length; i++) {
                    output[i] = this.samples[this.readIndex++] ?? 0;
                }

                if (this.readIndex > 8192) {
                    this.samples = this.samples.slice(this.readIndex);
                    this.readIndex = 0;
                }
            };

            this.node.connect(this.context.destination);
        }

        if (this.context.state === 'suspended') {
            this.context.resume().catch(console.warn);
        }
    }

    toggle() {
        this.state ^= 1; // $C030 toggles the speaker phase
    }

    advance(cycles) {
        if (!this.context || this.context.state !== 'running') return;

        const cyclesPerSample = CPU_HZ / this.context.sampleRate; // Convert CPU time to audio samples
        this.cycleRemainder += cycles;

        while (this.cycleRemainder >= cyclesPerSample) {
            this.samples.push(this.state ? SPEAKER_LEVEL : -SPEAKER_LEVEL);
            this.cycleRemainder -= cyclesPerSample;
        }
        
        // Drop stale samples if playback falls behind
        if (this.samples.length - this.readIndex > this.context.sampleRate) {
            this.samples = this.samples.slice(-this.context.sampleRate);
            this.readIndex = 0;
        }
    }
}
