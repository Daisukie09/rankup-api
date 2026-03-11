export default class ColorMap {
    private pixels;
    private samplefac;
    private network;
    private netindex;
    private bias;
    private freq;
    private radpower;
    constructor(pixels: Uint8Array, samplefac: number);
    init(): void;
    private unbiasnet;
    private altersingle;
    private alterneigh;
    private contest;
    private inxbuild;
    lookupRGB(b: number, g: number, r: number): number;
    learn(): void;
    buildColormap(): void;
    getColormap(): number[];
}
