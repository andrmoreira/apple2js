export class Memory {
    constructor() {
        this.ram = new Uint8Array(0x10000);
        
        this.ioRead=null; // C000-C0FF read hook
        this.ioWrite=null; // C000-C0FF write hook

        this.dirtyScanlines = new Uint8Array(384); // 192 lines x 2 pages
        this.offsetToScanline = new Int16Array(0x4000);
    }
    
    buildLut() {
        this.offsetToScanline.fill(-1);
        for (let row=0; row < 192; row++)
        {
            const src = ((row & 7) * 0x400) +
                    (((row >> 3) & 0x07) * 0x80) +
                    (((row >> 6) & 0x07) * 0x28);
            for (let x=0; x < 40; x++)
            {
                this.offsetToScanline[src+x] = row;
                this.offsetToScanline[0x2000+src+x] = row + 192;
            }
        }
        this.dirtyScanlines.fill(1);
    }
    
    readb(addr) {
        addr &= 0xFFFF;
        if (addr >= 0xC000 && addr <= 0xC0FF) {
            return this.ioRead ? this.ioRead(addr) : 0x00;
        }
        return this.ram[addr];
    }
    
    writeb(addr, val) {
        addr &= 0xFFFF;
        val &= 0xFF;
        
        if (addr >= 0x2000 && addr < 0x6000) {
            const sl = this.offsetToScanline[addr-0x2000];
            if (sl >= 0)
            {
                this.dirtyScanlines[sl] = 1;
            }
        }
        
        if (addr >= 0xC000 && addr <= 0xC0FF) {
            if (this.ioWrite)
            {
                this.ioWrite(addr, val);
            }
            return;
        }
        
        this.ram[addr] = val;
    }
    
    loadRom(data, offset=0xD000) {
        // BLOAD format: addr + len + payload
        if (data.length > 4)
        {
            const lo = data[0] | (data[1] << 8);
            const len = data[2] | (data[3] << 8);
            const isBload = (len + 4 === data.length) || (len + 4 <= data.length && lo >= 0x0800 && lo < 0xC000 && len > 0);

            if (isBload)
            {
                for (let i=0; i<len; i++)
                {
                    this.ram[lo+i] = data[4+i] & 0xFF;
                }
                this.dirtyScanlines.fill(1);
                console.log(`BLOAD $${lo.toString(16)} len $${len.toString(16)}`);
                return lo;
            }
        }

        for (let i=0; i<data.length; i++)
        {
            this.ram[offset+i] = data[i] & 0xFF;
        }
        return offset;
    }
}
