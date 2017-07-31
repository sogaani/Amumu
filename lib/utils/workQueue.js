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

    _ifReady(cb) {
        if (this.isReady) {
            cb();
        } else {
            this.once('ready', () => {
                cb();
            });
        }
    }

    startWorker() {
        const self = this;
        self._ifReady(() => {
            self.agenda.start();
        });
    }

    queueJob(name, data, option, callback) {
        const self = this;
        self._ifReady(() => {
            const job = self.agenda.create(name, data);
            if (option && option.priority) job.priority(option.priority);
            job.save(callback);
        });
    }
}

module.exports = WorkQueue;