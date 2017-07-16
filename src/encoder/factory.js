"use strict";

const Command = require('./command');
const Ffmpeg = require('./ffmpeg');
module.exports = (config) => {
    if (config.encoder.process) {
        return new Command(
            config.input.path,
            config.output.path,
            config.encoder.process,
            config.encoder.args);
    }else{
        return new Ffmpeg(
            config.input.path,
            config.output.path,
            config.encoder);
    }
}