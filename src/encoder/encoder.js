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


    async getStream(file, option) {

        const proc = this._process(async () => {
            let input = this.inputDir + file;
            return await ffmpeg.getStream(input, option);
        });

        return proc;
    }

    async encode(file, option) {
        let input = this.inputDir + file;
        let output = this.outputDir + file.replace(/\.[^.]+$/, `.${option.format}`)

        const proc = await this._process(async () => {
            option = option || this.default;

            let proc;

            try {
                if (option.process) { // ユーザ定義のエンコーダー
                    proc = command.exec(
                        input,
                        output,
                        option.process,
                        option.args);
                } else {                    // ffmpeg
                    proc = await ffmpeg.exec(
                        input,
                        output,
                        option);
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
            this.emit('exit', err, output);
        });

        return proc;
    }
}

module.exports = Encoder;