"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PixelWriter {
    static maxCode(nBits) {
        return (1 << nBits) - 1;
    }
    pixels;
    width;
    height;
    remaining;
    initCodeSize;
    accum = new Uint8Array(256);
    hTab = new Int32Array(5003);
    codetab = new Int32Array(5003);
    curAccum = 0;
    curBits = 0;
    curPixel;
    freeEnt = 0;
    aCount;
    maxCode;
    nBits;
    clearFlag = false;
    globalInitBits;
    clearCode;
    EOFCode;
    bitMasks = [
        0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F,
        0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF,
        0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF
    ];
    constructor(width, height, details) {
        this.width = width;
        this.height = height;
        this.pixels = details.pixels;
        this.initCodeSize = Math.max(2, details.colorDepth);
    }
    charOut(bit, outs) {
        this.accum[this.aCount++] = bit;
        if (this.aCount >= 254)
            this.flush(outs);
    }
    clBlock(outs) {
        this.clHash(5003);
        this.freeEnt = this.clearCode + 2;
        this.clearFlag = true;
        this.output(this.clearCode, outs);
    }
    clHash(hSize) {
        for (let i = 0; i < hSize; ++i)
            this.hTab[i] = -1;
    }
    compress(init_bits, outs) {
        let fcode, c, i, ent, disp, hshift;
        this.globalInitBits = init_bits;
        this.clearFlag = false;
        this.nBits = this.globalInitBits;
        this.maxCode = PixelWriter.maxCode(this.nBits);
        this.clearCode = 1 << (init_bits - 1);
        this.EOFCode = this.clearCode + 1;
        this.freeEnt = this.clearCode + 2;
        this.aCount = 0;
        ent = this.nextPixel();
        hshift = 0;
        for (fcode = 5003; fcode < 65536; fcode *= 2)
            ++hshift;
        hshift = 8 - hshift;
        const hsize_reg = 5003;
        this.clHash(hsize_reg);
        this.output(this.clearCode, outs);
        loopOuter: while ((c = this.nextPixel()) != -1) {
            fcode = (c << 12) + ent;
            i = (c << hshift) ^ ent;
            if (this.hTab[i] === fcode) {
                ent = this.codetab[i];
                continue;
            }
            else if (this.hTab[i] >= 0) {
                disp = hsize_reg - i;
                if (i === 0)
                    disp = 1;
                do {
                    if ((i -= disp) < 0)
                        i += hsize_reg;
                    if (this.hTab[i] === fcode) {
                        ent = this.codetab[i];
                        continue loopOuter;
                    }
                } while (this.hTab[i] >= 0);
            }
            this.output(ent, outs);
            ent = c;
            if (this.freeEnt < 1 << 12) {
                this.codetab[i] = this.freeEnt++;
                this.hTab[i] = fcode;
            }
            else {
                this.clBlock(outs);
            }
        }
        this.output(ent, outs);
        this.output(this.EOFCode, outs);
    }
    encode(outs) {
        outs.writeByte(this.initCodeSize);
        this.remaining = this.width * this.height;
        this.curPixel = 0;
        this.compress(this.initCodeSize + 1, outs);
        outs.writeByte(0);
    }
    flush(outs) {
        if (this.aCount > 0) {
            outs.writeByte(this.aCount);
            outs.writeBytes(this.accum, 0, this.aCount);
            this.aCount = 0;
        }
    }
    nextPixel() {
        if (this.remaining === 0)
            return -1;
        --this.remaining;
        const pix = this.pixels[this.curPixel++];
        return pix & 0xff;
    }
    output(code, outs) {
        this.curAccum &= this.bitMasks[this.curBits];
        this.curBits > 0 ?
            this.curAccum |= (code << this.curBits) :
            this.curAccum = code;
        this.curBits += this.nBits;
        while (this.curBits >= 8) {
            this.charOut((this.curAccum & 0xff), outs);
            this.curAccum >>= 8;
            this.curBits -= 8;
        }
        if (this.freeEnt > this.maxCode || this.clearFlag) {
            if (this.clearFlag) {
                this.maxCode = PixelWriter.maxCode(this.nBits = this.globalInitBits);
                this.clearFlag = false;
            }
            else {
                ++this.nBits;
                this.nBits == 12 ?
                    this.maxCode = 1 << 12 :
                    this.maxCode = PixelWriter.maxCode(this.nBits);
            }
        }
        if (code == this.EOFCode) {
            while (this.curBits > 0) {
                this.charOut((this.curAccum & 0xff), outs);
                this.curAccum >>= 8;
                this.curBits -= 8;
            }
            this.flush(outs);
        }
    }
}
exports.default = PixelWriter;
