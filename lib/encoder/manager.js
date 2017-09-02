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

    _isSame(encoder, input, option) {
        return encoder.input === input && encoder.config.size === option.size && encoder.config.quarity === option.quarity;
    }

    async _getEncoder(priority, input, option, retry) {
        //const caches = this.caches;
        //const cache_length = caches.length
        let tryCount = retry;
        const encoders = this.encoders;
        const encoder_length = encoders.length;
        const _priority = option.priority || priority;
        let encoder = null;
        const self = this;

        return new Promise((resolve, reject) => {
            async function find() {
                /*
                // 1. use cache
                for (let i = 0; i < cache_length; i++) {
                    if (_isSame(caches[i], input, option)) {
                        encoder = caches[i];
                        break;
                    }
                }
                */

                // 2. join encoding
                if (encoder === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        if (self._isSame(encoders[i], input, option) && encoders[i].isUsing === true) {
                            encoder = encoders[i];
                            break;
                        }
                    }
                }

                // 3. start new encode
                if (encoder === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        if (encoders[i].isUsing === false) {
                            encoder = encoders[i];
                            break;
                        }
                    }
                }

                // 4. takeover encoding
                if (encoder === null) {
                    for (let i = 0; i < encoder_length; i++) {
                        let encoder_priority = encoders[i].getPriority();
                        if (encoder_priority <= _priority) {
                            encoder = encoders[i];
                            await encoder.stopEncode();
                            break;
                        }
                    }
                }

                if (encoder === null) {
                    --tryCount;
                    if (tryCount > 0) {
                        setTimeout(find, 10000);
                    } else {
                        resolve(null);
                    }
                } else {
                    encoder.setPriority(_priority);
                    resolve(encoder);
                }
            }
            find();
        });
    }

    async _selectInput(program) {
        const self = this;

        if (program._isRecording) {
            return self.amumuPath + '/api/recording/' + program.id + '/watch.m2ts';
        } else if (await self.chinachu.existFile(program.id)) {
            return self.amumuPath + '/api/recorded/' + program.id + '/watch.m2ts';
        } else if (await self.chinachu.existFile(program.id, 'org')) {
            return self.amumuPath + '/api/recorded/' + program.id + '/watch.mp4?encoded=org';
        }
        return null;
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

    async encode(program, config) {
        const self = this;

        const _config = self._mergeConfigAndDefault(config);

        let appendix = '';

        if (!config.original) {
            appendix = '_' + _config.size + '_' + _config.quality + '_' + _config.hardware;
        }

        appendix += '.' + _config.format;

        const file = path.parse(program.recorded).name + appendix;

        const output = this.outputDir + file;

        const encoder = await self._encode(program, _config, output, 10, 360);

        if (encoder) {
            encoder.once('exit', async (err) => {
                if (!err) {
                    const encoded = {
                        file: file,
                        config: _config
                    };

                    self.db.pushEncoded(program, encoded, config.original);
                }
            });
        }

        return encoder;
    }

    async encodeHls(program, config, outputFormat) {
        const self = this;

        const _config = self._mergeConfigAndDefault(config);

        _config.hls = true;

        const encoder = await self._encode(program, _config, outputFormat, 20, 1);

        return encoder;
    }

    async _encode(program, config, outputFormat, priority, retry) {
        const self = this;

        const input = await self._selectInput(program);

        if (!input) return null;

        const encoder = await self._getEncoder(priority, input, config, retry);

        if (!encoder) return null;

        if (!self._isSame(encoder, input, config)) {
            const proc = await encoder.encode(input, outputFormat, config);
            if (!proc) return null;
        }

        return encoder;
    }
}


module.exports = EncodeManager;
