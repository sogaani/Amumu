"use strict";

const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const Agendash = require('agendash');
const express = require("express");
const DB_NAME = 'amumu'
const DB_COLLECTION = 'jobs'

const dboptions = {
};

class WorkQueue extends EventEmitter {
    constructor(dbpath, server) {
        super();
        const self = this;
        self.agenda = new Agenda({ db: { address: dbpath + DB_NAME, collection: DB_COLLECTION, options: dboptions } });
        self.isReady = false;
        self.agenda.once('ready', () => {
            self.isReady = true;
            self.emit('ready');
            if(server){
                const app = express();
                app.use('/dash', Agendash(self.agenda));
                app.listen(8000);
            }
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
            // すぐに実行
            const schedule = option.schedule || 'a minute ago';
            job.schedule(schedule);
            job.save(callback);
        });
    }
}

module.exports = WorkQueue;