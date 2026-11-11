export class Bus {
    constructor(memory) {
        this.mem=memory;
        this.mem.ioRead = (a) => this.read(a);
        this.mem.ioWrite = (a, v) => this.write(a,v);
        
        this.key=0x00; // C000/C010

        this.hooks=[];
    }

    hookIO(start, end, fn) {
        this.hooks.push({start, end, fn});
    }
    
    read(addr) {
        if (addr === 0xC000) {
            return this.key;
        }
        if (addr === 0xC010) {
            this.key &= 0x7F;
            return 0x00;
        }
        // hooks $C050-$C057
        for (let h of this.hooks) {
            if (addr >= h.start && addr <= h.end) {
                let v = h.fn(addr);
                if (v !== undefined) return v;
            }
        }
        if (addr >= 0xC000 && addr <= 0xC0FF) {
            return 0x00;
        }
        return this.mem.ram[addr & 0xFFFF];
    }
    
    write(addr, val) {
        if (addr === 0xC010) {
            this.key &= 0x7F;
        }
        
        for (let h of this.hooks) {
            if (addr >= h.start && addr <= h.end) {
                h.fn(addr, val, true);
            }
        }
    }
}
