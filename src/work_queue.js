"use strict";

const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const DB_NAME = 'amumu'
const DB_COLLECTION = 'jobs'

const dboptions = {
    server: {
        socketOptions: {
            socketTimeoutMS: 0,
            connectTimeoutMS: 0
        }
    }
};

class WorkQueue extends EventEmitter {
    constructor(dbpath) {
        super();
        this.agenda = new Agenda({ db: { address: dbpath + DB_NAME, collection: DB_COLLECTION, options: dboptions } });
        this.isReady = false;
        this.agenda.once('ready', () => {
            this.isReady = true;
            this.emit('ready')
        });
    }

    registerWorker(name, worker, limit) {
        limit = limit || 1;
        this.agenda.define(name, { concurrency: limit, lockLimit: limit, lockLifetime: 120 * 60 * 1000 }, (job, done) => worker(job, done));
    }

    startWorker(){
        if (this.isReady) {
            this.agenda.start();
        } else {
            this.on('ready', () => {
                this.agenda.start();
            });
        }
    }

    queueJob(name, data, callback) {
        if (this.isReady) {
            _queueJob(name, data, callback);
        } else {
            this.on('ready', () => {
                _queueJob(name, data, callback);
            });
        }
    }

    _queueJob(name, data, callback) {
        var job = this.agenda.create(name, data);
        job.save(callback);
    }
}

module.exports = WorkQueue;