const Encoder = require('./Encoder');
const Datastore = require('nedb');

const ENCODED_DATA_FILE = __dirname + '/../../data/encoded.db';
const MAX_PRIORITY = 100;
class EncodeManager {
    constructor(inputDir, outputDir, num, config) {
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.default = config;
        this.encoders = [];
        for (let i = 0; i < num; i++) {
            this.encoders.push(new Encoder(inputDir, outputDir, config));
        }
        this.db = new Datastore({ filename: ENCODED_DATA_FILE, autoload: true })
    }

    _isSame(encode, file, option) {
        return encode.file === file && encode.format === option.format && encode.size === option.size && encode.quarity === option.quarity;
    }

    _getEncoder(priority, file, option) {
        //const caches = this.caches;
        //const cache_length = caches.length
        let tryCount = 100;
        const encoders = this.encoders;
        const encoder_length = encoders.length
        let encoder = null;
        return new Promise((resolve, reject) => {
            function find() {
                /*
                // 1. use cache
                for (let i = 0; i < cache_length; i++) {
                    if (_isSame(caches[i], file, option)) {
                        encoder = caches[i];
                        break;
                    }
                }

                // 2. join encoding
                if (encode === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        if (_isSame(encoders[i], file, option)) {
                            encode = encoders[i];
                            break;
                        }
                    }
                }
                */

                // 3. start new encode
                if (encoder === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        if (encoders[i].isUsing === false) {
                            encoder = encoders[i];
                            break;
                        }
                    }
                }

                /*
                // 3. replace existing
                if (encode === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        if (encoders[i].users.length === 0) {
                            encode = encoders[i];
                            break;
                        }
                    }
                }

                // 4. takeover encoding
                if (encode === null) {
                    let priority = MAX_PRIORITY;
                    for (let i = 0; i < encoder_length; i++) {
                        let encoder_priority = encoders[i].getPriority();
                        if (encoders[i].isUsing === true && encoder_priority < option.priority && encoder_priority < priority) {
                            encode = encoders[i];
                            priority = encoder_priority;
                        }
                    }
                }
                */

                if (encoder === null) {
                    --tryCount;
                    if (tryCount > 0) {
                        setTimeout(find, 250);
                    } else {
                        reject(new Error("no available tuners"));
                    }
                } else {
                    resolve(encoder);
                }
            }
            find();
        });
    }

    _pushProgram(program) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db.find({ 'id': program.id }, function (err, docs) {

                if (err) reject(err);

                if (docs.length) {
                    // update program
                    self.db.update({ 'id': program.id }, program, {}, (err) => {
                        if (err) reject(err);
                    });

                } else {
                    // new program
                    self.db.insert(program, (err) => {
                        if (err) reject(err);
                    });
                }

                resolve(program);
            });
        });
    }

    async encode(program) {

        const self = this;
        const file = program.recorded.match(/\/([^\/]+?)$/)[1];
        const encoder = await self._getEncoder(10, file, this.default);
        const proc = await encoder.encode(file, this.default);

        return new Promise((resolve, reject) => {
            encoder.once('exit', async (err, encoded) => {

                if (err) {
                    reject(err);
                } else {
                    program.encoded = encoded;

                    await self._pushProgram(program);

                    resolve();
                }
            });
        });

    }

    encodeStream(priority, option) {

    }
}

module.exports = EncodeManager;
