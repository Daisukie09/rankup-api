"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ByteArray {
    data = [];
    getData() {
        return Buffer.from(this.data);
    }
    writeByte(value) {
        this.data.push(value);
    }
    writeUTFBytes(string) {
        for (let i = 0; i < string.length; i++) {
            this.writeByte(string.charCodeAt(i));
        }
    }
    // bad array type, fix
    writeBytes(array, offset, length) {
        const writtenLength = length || array.length;
        for (let i = offset || 0; i < writtenLength; i++) {
            this.writeByte(array[i]);
        }
    }
}
exports.default = ByteArray;
