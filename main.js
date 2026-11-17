import {Bus} from './bus.js';
import {Video} from './video.js';
import {Speaker} from './audio.js';
import {CPU6502} from './lib/cpu6502/cpu.js';
import {Memory} from './memory.js';
import {rom} from './rom.js';
import {mountKeyboard} from './keyboard.js';

mountKeyboard('#keyboard');

const canvas = document.getElementById('screen');
const mem = new Memory();
const bus = new Bus(mem);
const video = new Video(canvas, bus);
const speaker = new Speaker();
const cpu = new CPU6502(mem);

let sv = null;
let currentDecoder = "CANVAS_YUV";
let padCanvas = null;
let padCtx = null;
let displayConfig = null;
let shaderIntervalMs = 1000 / 30;
let lastShaderTime = 0;
let lastCpuTime = 0;
let cpuAccumulator = 0;
let lastVideoState = "";
let shaderFrames = 0;
let shaderTimeTotal = 0;

// 1.022727 MHz / 60fps = 17045 cycles per frame
const CPU_HZ = 1022727;

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
bus.hookIO(0xC050, 0xC057, (addr) => {
    video.write(addr);
});

function pressEmuKey(code)
{
    speaker.start();
    let c = typeof code === 'string' ? code.charCodeAt(0) : code;
    if (c === 8 || c === 127) c = 8;
    if (c === 13 || c === 10) c = 13;
    if (c >= 97 && c <= 122) c -= 32;
    if (c < 32 && c !== 7 && c !== 8 && c !== 9 && c !== 10 && c !== 11 && c !== 13 && c !== 21 && c !== 27) return;
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
        const now = performance.now();
        let elapsed = now - lastCpuTime;
        lastCpuTime = now;
        if (elapsed > 100) elapsed = 100;
        if (elapsed < 0) elapsed = 0;
        cpuAccumulator += (elapsed / 1000) * CPU_HZ;
        if (cpuAccumulator > CPU_HZ * 0.1) cpuAccumulator = CPU_HZ * 0.1;
        const cyclesToRun = Math.floor(cpuAccumulator);
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
        cpuAccumulator -= cycles;
        if (cpuAccumulator < 0) cpuAccumulator = 0;
        video.render();
    }
    requestAnimationFrame(frame);
}

function shaderLoop(now) {
    if (!powered) {
        requestAnimationFrame(shaderLoop);
        return;
    }
    if (sv) {
        const state = (video.text ? "T" : "G") + (video.hires ? "H" : "L") + (video.page || 1) + (video.mixed ? "M" : "");
        const stateChanged = state !== lastVideoState;
        
        if (stateChanged) {
            lastVideoState = state;
            const want = video.text ? "CANVAS_RGB" : "CANVAS_YUV";
            if (want !== currentDecoder) {
                currentDecoder = want;
                displayConfig.videoDecoder = want;
                sv.displayConfiguration = displayConfig;
            }
        }
        const sinceLast = now - lastShaderTime;
        const shouldRender = stateChanged || sinceLast >= shaderIntervalMs;
        if (shouldRender) {
            lastShaderTime = now;
            const t0 = performance.now();
            try {
                if (!padCanvas) {
                    padCanvas = document.createElement('canvas');
                    padCanvas.width = 592;
                    padCanvas.height = 416;
                    padCtx = padCanvas.getContext('2d', { willReadFrequently: true, alpha: false });
                }
                padCtx.fillStyle = "#000";
                padCtx.fillRect(0, 0, 592, 416);
                padCtx.drawImage(canvas, 16, 16);
                const imageData = padCtx.getImageData(0, 0, 592, 416);
                sv.image = new screenEmu.ImageInfo(imageData);
                sv.vsync();
            } catch (e) {}
            
            const dur = performance.now() - t0;
            shaderFrames++;
            shaderTimeTotal += dur;
            
            if (shaderFrames >= 30) {
                const avg = shaderTimeTotal / shaderFrames;  
                shaderFrames=0;
                shaderTimeTotal=0;
                
                if (avg > 20 && shaderIntervalMs < 1000 / 15) {
                    shaderIntervalMs = 1000 / 15;
                } else if (avg > 12 && shaderIntervalMs < 1000 / 20) {
                    shaderIntervalMs = 1000 / 20;
                } else if (avg < 8 && shaderIntervalMs > 1000 / 30) {
                    shaderIntervalMs = 1000 / 30;
                }
            }
        }
    }
    requestAnimationFrame(shaderLoop);
}

async function init() {
    const crtCanvas = document.getElementById('crt');

    canvas.width = 560;
    canvas.height = 384;
    if (crtCanvas) {
        crtCanvas.width = 592;
        crtCanvas.height = 416;
    }

    try {
        if (crtCanvas && typeof screenEmu !== 'undefined') {
            sv = new screenEmu.ScreenView(crtCanvas);
            await sv.initOpenGL();
            displayConfig = new screenEmu.DisplayConfiguration();
            displayConfig.displayResolution = new screenEmu.Size(592, 416);
            displayConfig.videoDecoder = "CANVAS_YUV";
            sv.displayConfiguration = displayConfig;
        } else {
            sv = null;
        }
    } catch (e) {
        sv = null;
    }

    lastCpuTime = performance.now();
    lastShaderTime = performance.now();
    frame();
    requestAnimationFrame(shaderLoop);
    
    document.body.classList.add('power-off');
    if (typeof window.setPower === 'function') window.setPower(false);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('ready');
        });
    });
}

init();
