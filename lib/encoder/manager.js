const Encoder = require('./encoder');
const Datastore = require('../utils/database');
const path = require('path');
const ChinachuClient = require('../chinachu/client');

const MAX_PRIORITY = 100;
class EncodeManager {
    constructor(outputDir, num, config, amumuPath, dbPath) {

        this.outputDir = outputDir;
        this.default = config;
        this.encoders = [];
        this.amumuPath = amumuPath;
        this.chinachu = new ChinachuClient(amumuPath);
        for (let i = 0; i < num; i++) {
            this.encoders.push(new Encoder(config));
        }
        this.db = new Datastore(dbPath);
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

    _selectInput(program) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            if (await self.chinachu.existFile(program.id)) {
                resolve(self.amumuPath + '/api/recorded/' + program.id + '/watch.m2ts');
            } else if (await self.chinachu.existFile(program.id, 'org')) {
                resolve(self.amumuPath + '/api/recorded/' + program.id + '/watch.mp4?encoded=org');
            } else {
                reject(new Error('File id:' + program.id + ' not exist'));
            }
        });
    }

    _mergeConfigAndDefault(config) {
        if (config && (config.size || config.quality) && this.default.process) {
            return config;
        }

        let _config = Object.assign({}, this.default);
        if (config) {
            _config = Object.assign(_config, config);
        }

        return _config;
    }

    encode(program, config) {
        const self = this;

        return new Promise(async (resolve, reject) => {
            const _config = self._mergeConfigAndDefault(config);

            let appendix = '';

            if (!config.original) {
                appendix = '_' + _config.size + '_' + _config.quality + '_' + _config.hardware;
            }

            appendix += '.' + _config.format;

            const file = path.parse(program.recorded).name + appendix;

            const output = this.outputDir + file;

            const cb = async (err) => {
                if (err) {
                    reject(err);
                } else {
                    const encoded = {
                        file: file,
                        config: _config
                    };

                    await self.db.pushEncoded(program, encoded, config.original);
                    resolve();
                }
            };

            self._encode(program, _config, output, 10, cb);
        });
    }

    encodeHls(program, config, outputFormat) {
        const self = this;

        return new Promise(async (resolve, reject) => {
            const _config = self._mergeConfigAndDefault(config);

            _config.hls = true;

            const cb = async (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            };

            self._encode(program, _config, outputFormat, 20, cb);
        });
    }

    async _encode(program, config, outputFormat, priority, callback) {
        const self = this;

        const input = await self._selectInput(program);

        const encoder = await self._getEncoder(priority, outputFormat, config);

        encoder.encode(input, outputFormat, config);

        if (callback) {
            encoder.once('exit', callback);
        }
    }
}


module.exports = EncodeManager;
