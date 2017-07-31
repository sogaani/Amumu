"use strict";

const Datastore = require('nedb');
const MongoClient = require('mongodb').MongoClient
const EventEmitter = require('events');

const ENCODED_DATA_FILE = __dirname + '/../../data/encoded.db';

const dboptions = {
    socketOptions: {
        socketTimeoutMS: 0,
        connectTimeoutMS: 0
    }
};

class EncodedDatabase extends EventEmitter {
    constructor(path) {
        super();
        const self = this;
        self.isReady = false;
        if (path) {
            MongoClient.connect(path, dboptions, (err, db) => {
                if (err) {
                    self.emit('err');
                } else {
                    self.db = db.collection("encoded");
                    self._init();
                    self.emit('ready');
                }
            });
        } else {
            self.db = new Datastore({ filename: dbpath, autoload: true })
            self._init();
        }
    }

    _init() {
        this.isReady = true;
        this.db.ensureIndex({ fieldName: 'id', unique: true });
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

    getProgramById(id) {
        const self = this;
        return new Promise((resolve, reject) => {
            _ifReady(() => {
                self.db.find({ 'id': id }, function (err, docs) {
                    if (err) reject(err);
                    if (docs.length) {
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
            _ifReady(() => {
                self.db.find({}, function (err, docs) {
                    if (err) reject(err);
                    resolve(docs);
                });
            });
        });
    }

    removeProgram(program) {
        const self = this;
        _ifReady(() => {
            self.db.remove({ _id: program._id }, {});
        });
    }

    removeEncoded(program, encoded) {
        const self = this;
        _ifReady(() => {
            self.db.update({ 'id': program.id }, { $pull: { encoded: encoded } }, {});
        });
    }

    pushEncoded(program, encoded, original) {
        const self = this;
        return new Promise((resolve, reject) => {
            _ifReady(() => {
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
        });
    }
}

module.exports = EncodedDatabase;