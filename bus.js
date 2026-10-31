export class Bus {
    constructor(memory) {
        this.mem=memory;
        this.mem.ioRead = (a) => this.read(a);
        this.mem.ioWrite = (a, v) => this.write(a,v);
        
        this.hires=0; // C050=off C057=on
        this.text=1; // C050=off C051=on
        this.page2=0; // C054=off C055=on
        this.mixed=0; // C052=off C053=on
        
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
        if (addr === 0xC050) {
            this.text=0;
            this.hires=0;
        }
        if (addr === 0xC051) this.text=1;
        if (addr === 0xC052) this.mixed=0;
        if (addr === 0xC053) this.mixed=1;
        if (addr === 0xC054) this.page2=0;
        if (addr === 0xC055) this.page2=1;
        if (addr === 0xC056) this.hires=0;
        if (addr === 0xC057) this.hires=1;

        for (let h of this.hooks) {
            if (addr >= h.start && addr <= h.end) {
                h.fn(addr, val, true);
            }
        }
    }
}
