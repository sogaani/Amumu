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
        const self = this;

        if (self.isUsing) {
            return Promise.reject(new Error('other user is using encoder'));
        }

        self.isUsing = true;

        const proc = await func();

        proc.once('exit', (code) => {
            self.isUsing = false;

            let err = null;
            if (code != 0) {
                err = new Error('Encode process exit with code:' + code);
            }

            self.emit('exit', err);
        });

        return proc;
    }

    async encode(input, output, config) {

        return await this._process(async () => {
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
            return proc
        });
    }
}

module.exports = Encoder;