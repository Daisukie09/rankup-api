export declare enum ErrorCode {
    "CANVA_GIF_ERROR" = "Canva-Gif Error",
    "DECODER_ERROR" = "Decoder Error",
    "ENCODER_ERROR" = "Encoder Error"
}
export declare class CanvaGifError extends Error {
    message: string;
    statusCode: ErrorCode;
    createdAt: Date;
    constructor(message: string, code?: ErrorCode);
    get createdTimestamp(): number;
    valueOf(): ErrorCode;
    toJSON(): {
        stack: string;
        code: ErrorCode;
        message: string;
        created: number;
    };
    toString(): string;
}
