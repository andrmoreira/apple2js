import {CHAR_ROM_DATA} from './char-rom.js';

const YUV_WHITE = "rgb(255,128,128)";
const YUV_BLACK = "#000";

export class Video {
    constructor(canvas, bus) {
        this.ctx = canvas.getContext("2d");
        this.bus=bus;
        this.mem=bus.mem;
        this.text=true;
        this.hires=false;
        this.mixed=false;
        this.page=1;
        this.isGR=false;
        this.flashOn=true;
        setInterval(() => { this.flashOn = !this.flashOn; }, 250);

        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, 560, 384);
    }
    
    write(addr) {
        if (addr === 0xC050) this.text=false;
        if (addr === 0xC051) this.text=true;
        if (addr === 0xC052) this.mixed=false;
        if (addr === 0xC053) this.mixed=true;
        if (addr === 0xC054) this.page=1;
        if (addr === 0xC055) this.page=2;
        if (addr === 0xC056) this.hires=false;
        if (addr === 0xC057) this.hires=true;
        this.isGR = !this.text && !this.hires;
    }
    
    render() {
        if (!this.ctx) return;

        if (!this.text) {
            if (this.hires) {
                this.renderHires();
            } else {
                this.renderLores();
            }
            if (this.mixed) {
                this.renderTextMixed();
            }
        } else {
            this.renderText();
        }
    }

    // direct memory access
    readMem(addr) {
        if (this.mem && this.mem.ram) {
            return this.mem.ram[addr & 0xFFFF];
        }
        return this.bus.read(addr);
    }
    
    renderText() {
        const base = 0x0400;
        // 40x24 text mode
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, 560, 384);
    
        for (let row=0; row < 24; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                const raw = this.readMem(addr);
                if (raw === 0) continue;
    
                // 0x00-0x3F inverse
                // 0x40-0x7F flash
                // 0x80-0xFF normal
                let mode = "normal";
                let code = raw;
                if (raw < 0x40) {
                    mode = "inverse";
                    code = raw + 0x40;
                } else if (raw < 0x80) {
                    mode = "flash";
                    code = raw;
                } else {
                    mode = "normal";
                    code = raw & 0x7F;
                }
    
                if (mode === "flash" && !this.flashOn) continue;
                if (code < 0x20) code += 0x40;
    
                const glyph = CHAR_ROM_DATA[code] || CHAR_ROM_DATA[32];
                const px = col * 14;
                const py = row * 16;
    
                // inverse background
                if (mode === "inverse") {
                    this.ctx.fillStyle = "#FFF";
                    this.ctx.fillRect(px, py, 14, 16);
                }
    
                for (let y=0; y < 7; y++) {
                    for (let x=0; x < 5; x++) {
                        const bitOn = (glyph[y] >> (4 - x)) & 1;
                        let on = bitOn;
                        if (mode === "inverse") on = !bitOn;
                        if (!on) continue;
                        if (mode === "inverse") this.ctx.fillStyle = "#000";
                        else this.ctx.fillStyle = "#FFF";
                        this.ctx.fillRect(px + x * 2 + 2, py + y * 2, 2, 2);
                    }
                }
            }
        }
        
        const { x: cursorX, y: cursorY } = this.getCursor();
        if (this.flashOn) {
            const px = cursorX * 14;
            const py = cursorY * 16;
            this.ctx.fillStyle = "#FFF";
            this.ctx.fillRect(px, py, 14, 15);
        }
    }

    renderTextMixed() {
        const base = 0x0400;
        // 4x40 bottom mixed mode
        this.ctx.fillStyle = YUV_BLACK;
        this.ctx.fillRect(0, 320, 560, 64);
    
        for (let row=20; row < 24; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                const raw = this.readMem(addr);
                if (raw === 0) continue;
    
                let mode = "normal";
                let code = raw;
                if (raw < 0x40) {
                    mode = "inverse";
                    code = raw + 0x40;
                } else if (raw < 0x80) {
                    mode = "flash"; code = raw;
                } else {
                    mode = "normal";
                    code = raw & 0x7F;
                }
    
                if (mode === "flash" && !this.flashOn) continue;
                if (code < 0x20) code += 0x40;
    
                const glyph = CHAR_ROM_DATA[code] || CHAR_ROM_DATA[32];
                const px = col * 14;
                const py = (row - 20) * 16 + 320;
    
                if (mode === "inverse") {
                    this.ctx.fillStyle = YUV_WHITE;
                    this.ctx.fillRect(px, py, 14, 16);
                }
    
                for (let y=0; y < 7; y++) {
                    for (let x=0; x < 5; x++) {
                        const bitOn = (glyph[y] >> (4 - x)) & 1;
                        let on = bitOn;
                        if (mode === "inverse") on = !bitOn;
                        if (!on) continue;
                        
                        let color = YUV_WHITE;
                        if (mode === "inverse") color = YUV_BLACK;
    
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(px + x * 2 + 2, py + y * 2, 2, 2);
                    }
                }
            }
        }
        
        const { x: cursorX, y: cursorY } = this.getCursor();
        if (this.flashOn && cursorY >= 20) {
            const px = cursorX * 14;
            const py = (cursorY - 20) * 16 + 320;
            this.ctx.fillStyle = YUV_WHITE;
            this.ctx.fillRect(px, py, 14, 15);
        }
    }

    renderHires() {
        // 280x192 hires mode
        const base = this.page === 1 ? 0x2000 : 0x4000;
        this.ctx.fillStyle = YUV_BLACK;
        this.ctx.fillRect(0, 0, 560, 384);
    
        for (let y=0; y < 192; y++) {
            for (let xByte=0; xByte < 40; xByte++) {
                const addr = base + this.hiresOffset(y, xByte);
                const byte = this.readMem(addr);
                const phaseShift = (byte & 0x80) ? 1 : 0;
    
                for (let bit=0; bit < 7; bit++) {
                    if (byte & (1 << bit)) {
                        this.ctx.fillStyle = YUV_WHITE;
                        this.ctx.fillRect(xByte * 14 + bit * 2 + phaseShift, y * 2, 2, 2);
                    }
                }
            }
        }
    }

    renderLores() {
        // 40x48 lo-res mode
        const base = this.page === 1 ? 0x0400 : 0x0800;
        this.ctx.fillStyle = YUV_BLACK;
        this.ctx.fillRect(0, 0, 560, 384);

        const maxRow = this.mixed ? 20 : 24;

        for (let row=0; row < maxRow; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                const val = this.readMem(addr);
                const topColor = (val >> 4) & 0x0F;
                const botColor = val & 0x0F;
                const phaseShift = (col & 1) ? 2 : 0;

                this.drawLoresBlock(col * 14, row * 16, topColor, phaseShift);
                this.drawLoresBlock(col * 14, row * 16 + 8, botColor, phaseShift);
            }
        }
    }

    drawLoresBlock(px, py, colorIdx, phaseShift) {
        if (colorIdx === 0) return;
        this.ctx.fillStyle = YUV_WHITE;

        for (let x=0; x < 14; x++) {
            const bit = (x + phaseShift) & 3;
            if ((colorIdx >> bit) & 1) {
                this.ctx.fillRect(px + x, py, 1, 8);
            }
        }
    }

    getCursor() {
        return {
            x: this.readMem(0x24),
            y: this.readMem(0x25)
        };
    }

    // Wozniak's text addressing
    textOffset(row, col) {
        return ((row & 0x07) << 7) | ((row >> 3) * 40 + col);
    }

    // Wozniak's hires addressing
    hiresOffset(y, xByte) {
        return ((y & 0x07) << 10) | ((y & 0x38) << 4) | ((y >> 6) * 40 + xByte);
    }
}
