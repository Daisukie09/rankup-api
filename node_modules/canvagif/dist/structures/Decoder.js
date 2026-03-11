"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = void 0;
const tslib_1 = require("tslib");
const ndarray_1 = tslib_1.__importDefault(require("ndarray"));
const ndarray_ops_1 = tslib_1.__importDefault(require("ndarray-ops"));
const multi_integer_range_1 = require("multi-integer-range");
const omggif_1 = require("omggif");
const fs_1 = require("fs");
const canvas_1 = require("canvas");
const axios_1 = tslib_1.__importDefault(require("axios"));
const Util_1 = require("../utils/Util");
const CanvaGifError_1 = require("./CanvaGifError");
class Decoder {
    url;
    frames = "all";
    cumulative = true;
    acceptedFrames = "all";
    started = false;
    async handleGIF(data, cb) {
        let reader, ndata;
        try {
            reader = new omggif_1.GifReader(data);
        }
        catch (err) {
            cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
            return;
        }
        if (reader.numFrames() > 0) {
            const nshape = [reader.numFrames(), reader.height, reader.width, 4];
            try {
                ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2] * nshape[3]);
            }
            catch (err) {
                cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
                return;
            }
            const result = (0, ndarray_1.default)(ndata, nshape);
            try {
                for (let i = 0; i < reader.numFrames(); ++i) {
                    reader.decodeAndBlitFrameRGBA(i, ndata.subarray(result.index(i, 0, 0, 0), result.index(i + 1, 0, 0, 0)));
                }
            }
            catch (err) {
                cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
                return;
            }
            cb(null, result.transpose(0, 2, 1), reader);
        }
        else {
            const nshape = [reader.height, reader.width, 4];
            const ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2]);
            const result = (0, ndarray_1.default)(ndata, nshape);
            try {
                reader.decodeAndBlitFrameRGBA(0, ndata);
            }
            catch (err) {
                cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
                return;
            }
            cb(null, result.transpose(1, 0));
        }
    }
    getPixels(url, cb) {
        if (Buffer.isBuffer(url)) {
            this.handleGIF(url, cb);
        }
        else if (url.indexOf('data:') === 0) {
            try {
                const buffer = (0, Util_1.parseDataUri)(url);
                if (buffer) {
                    process.nextTick(() => {
                        this.handleGIF(buffer.data, cb);
                    });
                }
                else {
                    process.nextTick(() => {
                        cb(new CanvaGifError_1.CanvaGifError('Error parsing data URI', CanvaGifError_1.ErrorCode.DECODER_ERROR));
                    });
                }
            }
            catch (err) {
                process.nextTick(() => {
                    cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
                });
            }
        }
        else if (url.includes("https") || url.includes("http") && (0, Util_1.isImage)(url)) {
            axios_1.default.get(url, { responseType: 'arraybuffer' }).then((response) => {
                const buffer = Buffer.from(response.data, "utf-8");
                this.handleGIF(buffer, cb);
            }).catch(err => cb(err));
        }
        else {
            (0, fs_1.readFile)(url, (err, data) => {
                if (err) {
                    cb(new CanvaGifError_1.CanvaGifError(err.toString(), CanvaGifError_1.ErrorCode.DECODER_ERROR));
                    return;
                }
                this.handleGIF(data, cb);
            });
        }
    }
    handleData(array, data, frame) {
        if (array.shape.length === 4) {
            return this.handleData(array.pick(frame), data, 0);
        }
        else if (array.shape.length === 3) {
            if (array.shape[2] === 3) {
                ndarray_ops_1.default.assign((0, ndarray_1.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), array);
                ndarray_ops_1.default.assigns((0, ndarray_1.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
            }
            else if (array.shape[2] === 4) {
                ndarray_ops_1.default.assign((0, ndarray_1.default)(data, [array.shape[0], array.shape[1], 4], [4, array.shape[0] * 4, 1]), array);
            }
            else if (array.shape[2] === 1) {
                ndarray_ops_1.default.assign((0, ndarray_1.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), (0, ndarray_1.default)(array.data, [array.shape[0], array.shape[1], 3], [array.stride[0], array.stride[1], 0], array.offset));
                ndarray_ops_1.default.assigns((0, ndarray_1.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
            }
            else {
                throw new CanvaGifError_1.CanvaGifError('Incompatible array shape', CanvaGifError_1.ErrorCode.DECODER_ERROR);
            }
        }
        else if (array.shape.length === 2) {
            ndarray_ops_1.default.assign((0, ndarray_1.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), (0, ndarray_1.default)(array.data, [array.shape[0], array.shape[1], 3], [array.stride[0], array.stride[1], 0], array.offset));
            ndarray_ops_1.default.assigns((0, ndarray_1.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
        }
        else {
            throw new CanvaGifError_1.CanvaGifError('Incompatible array shape', CanvaGifError_1.ErrorCode.DECODER_ERROR);
        }
        return null;
    }
    savePixels(array) {
        const canvas = (0, canvas_1.createCanvas)(600, 338);
        const context = canvas.getContext('2d');
        canvas.width = array.shape[0];
        canvas.height = array.shape[1];
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = this.handleData(array, imageData.data);
        if (typeof data === 'string')
            throw Error(data);
        context.putImageData(imageData, 0, 0);
        return canvas;
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.getPixels(this.url, (err, pixels, reader) => {
                if (err)
                    reject(err);
                if (pixels.shape.length < 4) {
                    reject(new CanvaGifError_1.CanvaGifError('"URL" input should be multi-frame GIF.', CanvaGifError_1.ErrorCode.DECODER_ERROR));
                    return;
                }
                this.started = true;
                const frameData = [];
                let maxAccumulatedFrame = 0;
                for (let i = 0; i < pixels.shape[0]; i++) {
                    if (this.acceptedFrames !== 'all' && !this.acceptedFrames.has(i)) {
                        continue;
                    }
                    ((frameIndex) => {
                        frameData.push({
                            getImage: () => {
                                if (this.cumulative && frameIndex > maxAccumulatedFrame) {
                                    let lastFrame = pixels.pick(maxAccumulatedFrame);
                                    for (let f = maxAccumulatedFrame + 1; f <= frameIndex; f++) {
                                        const frame = pixels.pick(f);
                                        for (let x = 0; x < frame.shape[0]; x++) {
                                            for (let y = 0; y < frame.shape[1]; y++) {
                                                if (frame.get(x, y, 3) === 0) {
                                                    frame.set(x, y, 0, lastFrame.get(x, y, 0));
                                                    frame.set(x, y, 1, lastFrame.get(x, y, 1));
                                                    frame.set(x, y, 2, lastFrame.get(x, y, 2));
                                                    frame.set(x, y, 3, lastFrame.get(x, y, 3));
                                                }
                                            }
                                        }
                                        lastFrame = frame;
                                    }
                                    maxAccumulatedFrame = frameIndex;
                                }
                                const canvas = this.savePixels(pixels.pick(frameIndex));
                                return canvas;
                            },
                            details: reader.frameInfo(frameIndex),
                            frameIndex: frameIndex,
                        });
                    })(i);
                }
                resolve(frameData);
            });
        });
    }
    setUrl(url) {
        if (this.started)
            throw new CanvaGifError_1.CanvaGifError("You cannot change decode options after it starts.", CanvaGifError_1.ErrorCode.DECODER_ERROR);
        this.url = url;
        return this;
    }
    setFramesCount(count) {
        if (this.started)
            throw new CanvaGifError_1.CanvaGifError("You cannot change decode options after it starts.", CanvaGifError_1.ErrorCode.DECODER_ERROR);
        this.acceptedFrames = count === 'all' ? 'all' : new multi_integer_range_1.MultiRange(this.frames);
        return this;
    }
    setCollective(value) {
        if (this.started)
            throw new CanvaGifError_1.CanvaGifError("You cannot change decode options after it starts.", CanvaGifError_1.ErrorCode.DECODER_ERROR);
        this.cumulative = value;
        return this;
    }
}
exports.Decoder = Decoder;
