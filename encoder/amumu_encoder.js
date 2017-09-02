"use strict";

const WorkQueue = require('../lib/utils/workQueue');
const EncodeManager = require('../lib/encoder/manager');
const ChinachuClient = require('../lib/chinachu/client');
const HlsServer = require('../lib/hls/hls');
const access = require('../lib/utils/access');

const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');

var manager;
var workQueue;
var chinachu;
var hlsServer;

config.limit = config.limit || 1
config.deleteEncodedFile = config.deleteEncodedFile || false;

// 終了処理
process.on('SIGQUIT', () => {
    setTimeout(() => {
        process.exit(0);
    }, 0);
});

// 例外処理
process.on('uncaughtException', (err) => {
    console.error('uncaughtException: ' + err.stack);
});

function retryJob(job) {
    let retry = job.attrs.data.retry || 0;
    retry++;
    if (retry < 10) {
        job.attrs.data.retry = retry;
        workQueue.queueJob(job.attrs.name, job.attrs.data, { schedule: '1 minute later' });
    }
}

async function amumuEncode(job, done) {
    const id = job.attrs.data.program.id;

    const encoder = await manager.encode(job.attrs.data.program, job.attrs.data.config);

    if (!encoder) {
        retryJob(job);
        return done('cant start encode');
    }

    encoder.once('exit', (err) => {
        if (err) {
            retryJob(job);
            return done(err);
        }

        if (config.deleteEncodedFile && job.attrs.data.config.original) {
            workQueue.queueJob('amumu_delete', job.attrs.data, { schedule: 'an hour later' }, () => {
            });
        }
        return done();
    });
}

async function amumuDelete(job, done) {
    try {
        const id = job.attrs.data.program.id;

        await chinachu.deleteFile(id);

        return done();

    } catch (err) {
        console.log(err);
        retryJob(job);
        return done(err);
    }
}


function main() {
    workQueue = new WorkQueue(config.mongodbPath, true);
    manager = new EncodeManager(config.encoded.path, config.limit, config.encoder, config.chinachuPath, config.mongodbPath);
    chinachu = new ChinachuClient(config.chinachuPath);
    hlsServer = new HlsServer(chinachu, manager);

    if (config.encoded.type === 'smb') {
        access.samba(config.encoded);
    }

    workQueue.registerWorker('amumu_encode', amumuEncode, config.limit);
    workQueue.registerWorker('amumu_delete', amumuDelete, 1);

    workQueue.startWorker();
}

main();
