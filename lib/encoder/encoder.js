const command = require('./command');
const ffmpeg = require('./ffmpeg');
const EventEmitter = require('events');

class Encoder extends EventEmitter {
    constructor(config) {
        super();
        this.default = config;
        this.isUsing = false;
        this.priority = null;
        this.input = null;
        this.config = null;
        this.proc = null;
    }

    setPriority(priority) {
        this.priority = priority;
    }

    getPriority() {
        return this.priority;
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
            if (code !== 0) {
                err = new Error('Encode process exit with code:' + code);
            }

            self.emit('exit', err);
        });

        this.proc = proc;

        return proc;
    }

    stopEncode() {
        return new Promise((resolve, reject) => {
            if (this.isUsing) {
                this.proc.once('exit', () => {
                    resolve();
                });
                this.proc.kill('SIGKILL');
            } else {
                resolve();
            }
        });
    }

    async encode(input, output, config) {
        this.input = input;
        this.config = config;
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