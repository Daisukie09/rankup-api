import type { FrameData } from '../types';
export declare class Decoder {
    private url;
    private frames;
    private cumulative;
    private acceptedFrames;
    private started;
    private handleGIF;
    private getPixels;
    private handleData;
    private savePixels;
    start(): Promise<FrameData[]>;
    setUrl(url: string): this;
    setFramesCount(count: "all" | number): this;
    setCollective(value: boolean): this;
}
