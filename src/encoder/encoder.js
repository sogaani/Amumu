const command = require('./command');
const ffmpeg = require('./ffmpeg');
const EventEmitter = require('events');

class Encoder extends EventEmitter {
    constructor(inputDir, outputDir, config) {
        super();
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.default = config;
        this.isUsing = false;
        this.isUsing = false;
    }


    async _process(func) {
        if (this.isUsing) {
            return Promise.reject(new Error('other user is using encoder'));
        }

        this.isUsing = true;

        const proc = await func();

        proc.once('exit', (code) => {
            this.isUsing = false;
        });

        return proc;
    }

    async encode(input, output, config) {

        const proc = await this._process(async () => {
            config = config || this.default;

            let proc;

            try {
                if (config.process) { // ユーザ定義のエンコーダー
                    proc = command.exec(
                        input,
                        output,
                        config.process,
                        config.args);
                } else {                    // ffmpeg
                    proc = await ffmpeg.exec(
                        input,
                        output,
                        config);
                }
            } catch (e) {
                console.log(e);
                this.isUsing = false;
            }
            console.log("return");
            return proc
        });

        proc.once('exit', (code) => {
            let err = null;
            if (code != 0) {
                err = new Error('Encode process exit with code:' + code);
            }
            let encoded = {
                file: output,
                config: config
            };
            this.emit('exit', err, encoded);
        });

        return proc;
    }
}

module.exports = Encoder;