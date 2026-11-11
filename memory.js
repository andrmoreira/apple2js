export class Memory {
    constructor() {
        this.ram = new Uint8Array(0x10000);
        
        this.ioRead=null; // C000-C0FF read hook
        this.ioWrite=null; // C000-C0FF write hook
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
