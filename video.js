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
        this.ctx.fillStyle = "#33FF66";
        this.ctx.font = "16px Courier New, monospace";
        this.ctx.textBaseline = "top";

        for (let row=0; row < 24; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                let val = this.readMem(addr) & 0x7F;
                if (val === 0) continue;
                if (val < 0x20) val += 0x40;
                this.ctx.fillText(String.fromCharCode(val), col * 14, row * 16);
            }
        }
    }

    renderTextMixed() {
        const base = 0x0400;
        // 4x40 bottom mixed mode
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 320, 560, 64);
        this.ctx.fillStyle = "#33FF66";
        this.ctx.font = "16px Courier New, monospace";
        this.ctx.textBaseline = "top";

        for (let row=20; row < 24; row++) {
            for (let col=0; col < 40; col++) {
                const addr = base + this.textOffset(row, col);
                let val = this.readMem(addr) & 0x7F;
                if (val === 0) continue;
                if (val < 0x20) val += 0x40;
                this.ctx.fillText(String.fromCharCode(val), col * 14, row * 16);
            }
        }
    }

    renderHires() {
        // 280x192 hires mode
        const base = this.page === 1 ? 0x2000 : 0x4000;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, 560, 384);
        this.ctx.fillStyle = "#33FF66";

        for (let y=0; y < 192; y++) {
            for (let xByte=0; xByte < 40; xByte++) {
                const addr = base + this.hiresOffset(y, xByte);
                const byte = this.readMem(addr);
                for (let bit=0; bit < 7; bit++) {
                    if (byte & (1 << bit)) {
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
