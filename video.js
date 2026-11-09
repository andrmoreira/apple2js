// Apple II char ROM - 7x8 pixels per char
// Each number is one row, each bit is one pixel
const CHAR_ROM = {};
function buildCharRom() {
    // 5x7 font table
    const font5x7 = {
        ' ': [0,0,0,0,0,0,0],
        '!': [0x04,0x04,0x04,0x04,0x00,0x04,0x00],
        '"': [0x0A,0x0A,0x00,0x00,0x00,0x00,0x00],
        '#': [0x0A,0x0A,0x1F,0x0A,0x1F,0x0A,0x0A],
        'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
        'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
        'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
        'D': [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
        'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
        'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
        'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],
        'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
        'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
        'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
        'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
        'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
        'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
        'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
        'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
        'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
        'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
        'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
        'S': [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E],
        'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
        'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
        'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
        'W': [0x11,0x11,0x11,0x15,0x15,0x15,0x0A],
        'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
        'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
        'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
        '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
        '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
        '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F],
        '3': [0x1F,0x02,0x04,0x0E,0x01,0x01,0x1E],
        '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
        '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
        '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
        '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
        '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
        '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
        ']': [0x0F,0x01,0x01,0x01,0x01,0x01,0x0F],
        '[': [0x1E,0x10,0x10,0x10,0x10,0x10,0x1E],
        ':': [0x00,0x0C,0x0C,0x00,0x0C,0x0C,0x00],
        ';': [0x00,0x0C,0x0C,0x00,0x0C,0x04,0x08],
        ',': [0x00,0x00,0x00,0x00,0x0C,0x04,0x08],
        '.': [0x00,0x00,0x00,0x00,0x0C,0x0C,0x00],
        '/': [0x01,0x01,0x02,0x04,0x08,0x10,0x10],
        '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
        '+': [0x00,0x04,0x04,0x1F,0x04,0x04,0x00],
        '*': [0x00,0x0A,0x04,0x1F,0x04,0x0A,0x00],
        '=': [0x00,0x00,0x1F,0x00,0x1F,0x00,0x00],
        '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
        ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
        '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02],
        '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
        '?': [0x0E,0x11,0x01,0x02,0x04,0x00,0x04],
        "'": [0x04,0x04,0x08,0x00,0x00,0x00,0x00],
    };
    // Build 256 codes
    for (let i=0; i < 256; i++) {
        let ch = String.fromCharCode(i & 0x7F);
        if (ch >= 'a' && ch <= 'z') ch = ch.toUpperCase();
        if (i < 0x20) ch = String.fromCharCode(i + 0x40);
        CHAR_ROM[i] = font5x7[ch] || font5x7[' '];
    }
    return CHAR_ROM;
}
const CHAR_ROM_DATA = buildCharRom();

export class Video {
    constructor(canvas, bus) {
        this.canvas=canvas;
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
    }

    renderTextMixed() {
        const base = 0x0400;
        // 4x40 bottom mixed mode
        this.ctx.fillStyle = "#000";
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
                    this.ctx.fillStyle = "#FFF";
                    this.ctx.fillRect(px, py, 14, 16);
                }
    
                for (let y=0; y < 7; y++) {
                    for (let x=0; x < 5; x++) {
                        const bitOn = (glyph[y] >> (4 - x)) & 1;
                        let on = bitOn;
                        if (mode === "inverse") on = !bitOn;
                        if (!on) continue;
                        
                        let color = "#FFF";
                        if (mode === "inverse") color = "#000";
                        else if (this.isGR) {
                            const leftOn = x > 0 ? (glyph[y] >> (4 - (x - 1))) & 1 : 0;
                            const rightOn = x < 4 ? (glyph[y] >> (4 - (x + 1))) & 1 : 0;
                            if (!leftOn && rightOn) {
                                color = "#B653FF";
                            } else if (leftOn && !rightOn) {
                                color = "#00FF00";
                            } else {
                                color = "#FFF";
                            }
                        }
    
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(px + x * 2 + 2, py + y * 2, 2, 2);
                    }
                }
            }
        }
    }

    renderHires() {
        // 280x192 hires mode
        const base = this.page === 1 ? 0x2000 : 0x4000;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, 560, 384);
    
        for (let y=0; y < 192; y++) {
            for (let xByte=0; xByte < 40; xByte++) {
                const addr = base + this.hiresOffset(y, xByte);
                const byte = this.readMem(addr);
                const palette = (byte & 0x80) ? 1 : 0;
    
                for (let bit=0; bit < 7; bit++) {
                    if (byte & (1 << bit)) {
                        const x = xByte * 7 + bit;
                        const left = bit > 0 ? (byte >> (bit - 1)) & 1 : 0;
    
                        let color;
                        if (left) {
                            color = "#FFF";
                        } else {
                            // isolated bit - artifact color
                            if ((x & 1) === 0) {
                                color = palette ? "#0B4FBA" : "#8C1D92";
                            } else {
                                color = palette ? "#FF6D00" : "#0CC00A";
                            }
                        }
    
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(xByte * 14 + bit * 2, y * 2, 2, 2);
                    }
                }
            }
        }
    }

    renderLores() {
        // 40x48 lo-res mode
        const base = this.page === 1 ? 0x0400 : 0x0800;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, 560, 384);
        
        // lo-res color table
        const colors = [
            "#000",
            "#8C1D92",
            "#1506A9",
            "#C62CD7",
            "#00724E",
            "#4E4E4E",
            "#0B4FBA",
            "#66B0F0",
            "#7A4F00",
            "#FF6D00",
            "#8C8C8C",
            "#FF9DB2",
            "#0CC00A",
            "#F5FF4A",
            "#5ED0FF",
            "#FFF"
        ];

        for (let row=0; row < 24; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                const val = this.readMem(addr);
                this.ctx.fillStyle = colors[(val >> 4) & 0x0F];
                this.ctx.fillRect(col * 14, row * 16, 14, 8);
                this.ctx.fillStyle = colors[val & 0x0F];
                this.ctx.fillRect(col * 14, row * 16 + 8, 14, 8);
            }
        }
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
