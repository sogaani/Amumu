"use strict";

const Command = require('./command');
const Ffmpeg = require('./ffmpeg');
module.exports = (config) => {
    if (config.encoder.process) {
        return new Command(
            config.recorded.path,
            config.encoded.path,
            config.encoder.process,
            config.encoder.args,
            config.encoder.format);
    } else {
        return new Ffmpeg(
            config.recorded.path,
            config.encoded.path,
            config.encoder);
    }
}