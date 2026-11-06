import {Bus} from './bus.js';
import {Video} from './video.js';
import {CPU6502} from './lib/cpu6502/cpu.js';
import {Memory} from './memory.js';
import {rom} from './rom.js';
import {mountKeyboard} from './keyboard.js';

mountKeyboard('#keyboard');

const canvas = document.getElementById('screen');
const mem = new Memory();
const bus = new Bus(mem);
const video = new Video(canvas, bus);
const cpu = new CPU6502(mem);

window._mem = mem;
window._cpu = cpu;
window._bus = bus;

window.resetEmu = () => {
    if (typeof cpu.cpuReset === 'function')
        cpu.cpuReset();
    else
        cpu.cpuInit();
    bus.key = 0;
};

let audioCtx = null;
let lastSpeakerState = 0;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Audio ($C030)
bus.hookIO(0xC030, 0xC030, (addr, val, isWrite) => {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    lastSpeakerState = lastSpeakerState === 0 ? 1 : 0;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.003);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.003);
});

// Video ($C050-$C057)
bus.hookIO(0xC050, 0xC057, (addr, val, isWrite) => {
    video.write(addr);
});

let lastKeyTime = 0;
let clearTimer = null;

function pressEmuKey(code)
{
    initAudio();
    let c = typeof code === 'string' ? code.charCodeAt(0) : code;
    if (c === 8 || c === 127) c = 8;
    if (c === 13 || c === 10) c = 13;
    if (c >= 97 && c <= 122) c -= 32;
    if (c < 32 && c !== 7 && c !== 8 && c !== 9 && c !== 10 && c !== 11 && c !== 13 && c !== 21 && c !== 27) return;
    const now = Date.now();
    if (now - lastKeyTime < 120) return;
    lastKeyTime = now;
    bus.key = (c & 0x7F) | 0x80;
    if (clearTimer) {
        clearTimeout(clearTimer);
    }
    clearTimer = setTimeout(() => { bus.key &= 0x7F; }, 50);
}

window.pressEmuKey = pressEmuKey;

window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key.length === 1) {
        pressEmuKey(e.key);
    } else if (e.key === 'Enter') {
        pressEmuKey(13);
    } else if (e.key === 'Backspace') {
        pressEmuKey(8);
    }
});

canvas.addEventListener('click', initAudio);
canvas.addEventListener('touchend', initAudio);

const input = document.getElementById('rom');
document.getElementById('drive1').onclick = () => {
    initAudio();
    input.click();
};

function bootImage(buf)
{
    if (buf.length >= 4) {
        const lo = buf[0] | (buf[1] << 8);
        const len = buf[2] | (buf[3] << 8);
        const availablePayload = buf.length - 4;
        const loadEnd = lo + len;
        const isBload =
            len > 0 &&
            len <= availablePayload &&
            lo >= 0x0200 &&
            loadEnd <= 0xC000;

        if (isBload) {
            for (let i=0; i<len; i++) {
                mem.ram[lo+i] = buf[4+i];
            }
            mem.dirtyScanlines.fill(1);
            video.write(0xC050);
            video.write(0xC057);
            bus.write(0xC050, 0);
            bus.write(0xC057, 0);
            cpu.PC = lo;
            if (cpu.SP !== undefined) {
                cpu.SP = 0xFF;
            }
            if (cpu.A !== undefined) {
                cpu.A = 0;
                cpu.X = 0;
                cpu.Y = 0;
            }
            return true;
        }
    }
    if (buf.length === 12288) {
        mem.loadRom(buf, 0xD000);
    } else if (buf.length === 16384) {
        mem.loadRom(buf, 0xC000);
    } else {
        return false;
    }
    cpu.cpuInit();
    return true;
}

input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    bootImage(buf);
};

function frame()
{
    video.render();
    requestAnimationFrame(frame);
}

function run()
{
    for (let i=0; i<1000; i++) {
        try {
            cpu.cpuStep();
        } catch (e) {}
    }
    setTimeout(run, 1);
}

function init() {
    frame();
    run();

    if (rom) {
        const buf = rom instanceof Uint8Array ? rom : new Uint8Array(rom);
        bootImage(buf);
    }
}

init();
