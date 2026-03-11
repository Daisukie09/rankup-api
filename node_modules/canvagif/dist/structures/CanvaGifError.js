"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvaGifError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["CANVA_GIF_ERROR"] = "Canva-Gif Error";
    ErrorCode["DECODER_ERROR"] = "Decoder Error";
    ErrorCode["ENCODER_ERROR"] = "Encoder Error";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
class CanvaGifError extends Error {
    message;
    statusCode;
    createdAt = new Date();
    constructor(message, code = ErrorCode.CANVA_GIF_ERROR) {
        super();
        this.message = `${message}`;
        this.statusCode = code;
        this.name = code;
        Error.captureStackTrace(this);
    }
    get createdTimestamp() {
        return this.createdAt.getTime();
    }
    valueOf() {
        return this.statusCode;
    }
    toJSON() {
        return {
            stack: this.stack,
            code: this.statusCode,
            message: this.message,
            created: this.createdTimestamp
        };
    }
    toString() {
        return this.stack;
    }
}
exports.CanvaGifError = CanvaGifError;
