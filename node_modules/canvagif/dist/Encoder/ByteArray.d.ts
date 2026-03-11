/// <reference types="node" />
export default class ByteArray {
    data: number[];
    getData(): Buffer;
    writeByte(value: number): void;
    writeUTFBytes(string: string): void;
    writeBytes(array: Uint8Array | number[], offset?: number, length?: number): void;
}
