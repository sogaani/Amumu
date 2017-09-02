"use strict";

const Datastore = require('nedb');
const MongoClient = require('mongodb').MongoClient
const EventEmitter = require('events');
const os = require('os');

const ENCODED_DATA_FILE = __dirname + '/../../data/encoded.db';

const dboptions = {
};

class EncodedDatabase extends EventEmitter {
    constructor(path) {
        super();
        const self = this;
        self.isReady = false;
        if (path) {
            MongoClient.connect(path + 'amumu', dboptions, (err, db) => {
                if (err) {
                    self.emit('err');
                } else {
                    self.admin = db;//db.admin();
                    self.db = db.collection('encoded');
                    self.db._find = self.db.find;
                    self.db.find = (q, cb) => {
                        self.db._find(q, (err, cursor) => {
                            cursor.toArray(cb);
                        });
                    }
                    self.isReady = true;
                    self.db.ensureIndex({ id: 1 }, { unique: true });
                    self.emit('ready');
                }
            });
        } else {
            self.db = new Datastore({ filename: ENCODED_DATA_FILE, autoload: true })
            self.isReady = true;
            self.db.ensureIndex({ fieldName: 'id', unique: true });
        }
    }

    _ifReady(cb) {
        if (this.isReady) {
            cb();
        } else {
            this.once('ready', () => {
                cb();
            });
        }
    }

    getEncoderIp() {
        const self = this;

        const ipv4 = ['localhost'];
        const interfaces = os.networkInterfaces();

        for (let dev in interfaces) {
            const device = interfaces[dev];
            const length = device.length;
            for (let i = 0; i < length; i++) {
                const details = device[i];
                if (!details.internal) {
                    switch (details.family) {
                        case "IPv4":
                            console.log('local: ' + details.address);
                            ipv4.push(details.address);
                            break;
                        case "IPv6":
                            break;
                    }
                }
            }
        }

        return new Promise((resolve, reject) => {
            self._ifReady(() => {
                self.admin.eval("db.currentOp(true)", function (err, data) {
                    console.log(data);
                    if (err) {
                        console.log(err);
                        return resolve(null);
                    } else {
                        const inprog = data.inprog;
                        const proglen = inprog.length;
                        const iplen = ipv4.length;
                        for (let i = 0; i < proglen; i++) {
                            const clientIp = inprog[i].client.replace(/:[0-9]*$/, '');
                            console.log('client: ' + clientIp);
                            let j = 0
                            for (; j < iplen; j++) {
                                if (ipv4[j] === clientIp) {
                                    break;
                                }
                            }

                            if (j === iplen) {
                                console.log('resolve: ' + clientIp);
                                return resolve(clientIp);
                            }
                        }
                    }
                });
            });
        });
    }

    getProgramById(id) {
        const self = this;
        return new Promise((resolve, reject) => {
            self._ifReady(() => {
                self.db.find({ 'id': id }, (err, docs) => {
                    if (err) reject(err);
                    if (docs && docs.length) {
                        resolve(docs[0]);
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    getPrograms() {
        const self = this;
        return new Promise((resolve, reject) => {
            self._ifReady(() => {
                self.db.find({}, (err, docs) => {
                    if (err) reject(err);
                    resolve(docs);
                });
            });
        });
    }

    removeProgram(program) {
        const self = this;
        self._ifReady(() => {
            self.db.remove({ _id: program._id }, {});
        });
    }

    removeEncoded(program, encoded) {
        const self = this;
        self._ifReady(() => {
            self.db.update({ 'id': program.id }, { $pull: { encoded: encoded } }, {});
        });
    }

    pushProgram(program) {
        const self = this;
        return new Promise((resolve, reject) => {
            self._ifReady(() => {
                self.db.find({ 'id': program.id }, (err, docs) => {
                    if (err) reject(err);

                    if (!docs.length) {
                        // new program

                        console.log('new');
                        self.db.insert(program, (err) => {
                            if (err) reject(err);
                            resolve(program);
                        });
                    }
                });
            });
        });
    }

    pushEncoded(program, encoded, original) {
        const self = this;
        return new Promise((resolve, reject) => {
            self._ifReady(() => {
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

                        if (!_program.encoded) _program.encoded = [];

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
        });
    }
}

module.exports = EncodedDatabase;
