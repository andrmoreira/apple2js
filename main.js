import {Bus} from './bus.js';
import {Video} from './video.js';
import {SpeakerAudio} from './audio.js';
import {CPU6502} from './lib/cpu6502/cpu.js';
import {Memory} from './memory.js';
import {rom} from './rom.js';
import {mountKeyboard} from './keyboard.js';

mountKeyboard('#keyboard');

const canvas = document.getElementById('screen');
const mem = new Memory();
const bus = new Bus(mem);
const video = new Video(canvas, bus);
const speaker = new SpeakerAudio();
const cpu = new CPU6502(mem);

// 1.022727 MHz / 60fps = 17045 cycles per frame
const CYCLES_PER_FRAME = 17045;

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

let powered = true;

window.setPower = (on) => {
    powered = on;
    if (!on) {
        mem.ram.fill(0, 0x0000, 0xC000);
        mem.dirtyScanlines.fill(1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        if (rom) {
            const buf = rom instanceof Uint8Array ? rom : new Uint8Array(rom);
            bootImage(buf);
        } else {
            window.resetEmu();
        }
    }
};

// Audio ($C030)
bus.hookIO(0xC030, 0xC030, () => speaker.toggle());

// Video ($C050-$C057)
bus.hookIO(0xC050, 0xC057, (addr, val, isWrite) => {
    video.write(addr);
});

let lastKeyTime = 0;

function pressEmuKey(code)
{
    speaker.start();
    let c = typeof code === 'string' ? code.charCodeAt(0) : code;
    if (c === 8 || c === 127) c = 8;
    if (c === 13 || c === 10) c = 13;
    if (c >= 97 && c <= 122) c -= 32;
    if (c < 32 && c !== 7 && c !== 8 && c !== 9 && c !== 10 && c !== 11 && c !== 13 && c !== 21 && c !== 27) return;
    const now = Date.now();
    if (now - lastKeyTime < 120) return;
    lastKeyTime = now;
    bus.key = (c & 0x7F) | 0x80;
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

canvas.addEventListener('click', () => speaker.start());
canvas.addEventListener('touchend', () => speaker.start());

const input = document.getElementById('rom');
document.getElementById('drive1').onclick = () => {
    speaker.start();
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

function frame() {
    if (powered) {
        let cyclesToRun = CYCLES_PER_FRAME;
        let cycles = 0;
        
        while (cycles < cyclesToRun) {
            let stepCycles = 1;

            try {
                stepCycles = cpu.cpuStep() || 1;
            } catch (e) {
                stepCycles = 1;
            }

            cycles += stepCycles;
            speaker.advance(stepCycles);
        }
        video.render();
    }
    requestAnimationFrame(frame);
}

function init() {
    frame();
    
    document.body.classList.add('power-off');
    if (typeof window.setPower === 'function') {
        window.setPower(false);
    }
}

init();
