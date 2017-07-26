const Encoder = require('./Encoder');
const Datastore = require('nedb');
const path = require('path');
const ChinachuClient = require('../chinachu/client');

const ENCODED_DATA_FILE = __dirname + '/../../data/encoded.db';
const MAX_PRIORITY = 100;
class EncodeManager {
    constructor(inputDir, outputDir, num, config, amumuPath) {
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.default = config;
        this.encoders = [];
        this.amumuPath = amumuPath;
        this.chinachu = new ChinachuClient(amumuPath);
        for (let i = 0; i < num; i++) {
            this.encoders.push(new Encoder(inputDir, outputDir, config));
        }
        this.db = new Datastore({ filename: ENCODED_DATA_FILE, autoload: true })
        this.db.ensureIndex({ fieldName: 'id', unique: true });
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

    getProgramById(id) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db.find({ 'id': id }, function (err, docs) {
                if (err) reject(err);
                if (docs.length) {
                    resolve(docs[0]);
                } else {
                    resolve(null);
                }
            });
        });
    }

    getPrograms() {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db.find({}, function (err, docs) {
                if (err) reject(err);
                resolve(docs);
            });
        });
    }

    removeProgram(program) {
        const self = this;
        self.db.remove({ _id: program._id }, {});
    }

    removeEncoded(program, encoded) {
        const self = this;
        self.db.update({ 'id': program.id }, { $pull: { encoded: encoded } }, {});
    }

    _pushEncoded(program, encoded, original) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db.find({ 'id': program.id }, function (err, docs) {

                if (err) reject(err);

                if (docs.length) {
                    // update program
                    console.log('update');
                    if (original) {
                        self.db.update({ 'id': program.id }, { $set: { encoded_original: encoded } }, {}, (err) => {
                            if (err) reject(err);
                            resolve(program);
                        });
                    } else {
                        self.db.update({ 'id': program.id }, { $addToSet: { encoded: encoded } }, {}, (err) => {
                            if (err) reject(err);
                            resolve(program);
                        });
                    }

                } else {
                    // new program
                    let _program = Object.assign({}, program);
                    _program.encoded = [];
                    if (original) {
                        _program.encoded_original = encoded;
                    } else {
                        _program.encoded.push(encoded);
                    }
                    console.log('new');
                    self.db.insert(_program, (err) => {
                        if (err) reject(err);
                        resolve(_program);
                    });
                }
            });
        });
    }

    encode(program, config) {
        const self = this;

        return new Promise(async (resolve, reject) => {
            let _config = Object.assign({}, this.default);
            let appendix = '';

            if (config) {
                _config = Object.assign(_config, config);

                if (!config.original) {
                    appendix = '_' + _config.size + '_' + _config.quality + '_' + _config.hardware;
                }
            }
            appendix += '.' + _config.format;

            const file = path.parse(program.recorded).name + appendix;
            let input;
            if (self.chinachu.existFile(program.id)) {
                input = self.amumuPath + '/api/recorded/' + program.id + '/watch.m2ts';
            } else if (self.chinachu.existFile(program.id, 'org')) {
                input = self.amumuPath + '/api/recorded/' + program.id + '/watch.mp4?encoded=org';
            } else {
                return reject(new Error('File id:' + program.id + ' not exist'));
            }

            const output = this.outputDir + file;

            const encoder = await self._getEncoder(10, output, _config);

            encoder.encode(input, output, _config);

            encoder.once('exit', async (err) => {

                if (err) {
                    reject(err);
                } else {
                    const encoded = {
                        file: file,
                        config: _config
                    }
                    program.encoded = [];

                    await self._pushEncoded(program, encoded, config.original);

                    resolve();
                }
            });
        });

    }

    encodeStream(priority, option) {

    }
}

module.exports = EncodeManager;
