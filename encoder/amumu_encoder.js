"use strict";

const WorkQueue = require('../lib/utils/workQueue');
const EncodeManager = require('../lib/encoder/manager');
const ChinachuClient = require('../lib/chinachu/client');
const access = require('../lib/utils/access');

const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');

var manager;
var workQueue;
var chinachu;

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

async function amumu(job, done) {
    try {
        const id = job.attrs.data.program.id;

        await manager.encode(job.attrs.data.program, job.attrs.data.config);
        if (config.deleteEncodedFile && job.attrs.data.config.original) await chinachu.deleteFile(id);

        console.log("encode end");
        done();

    } catch (err) {
        console.log(err);
        workQueue.queueJob('amumu_encode', job.attrs.data, {}, () => {
            done(err);
        });
    }
}

function main() {
    workQueue = new WorkQueue(config.mongodbPath);
    manager = new EncodeManager(config.encoded.path, config.limit, config.encoder, config.chinachuPath, config.mongodbPath);
    chinachu = new ChinachuClient(config.chinachuPath);

    if (config.encoded.type === 'smb') {
        access.samba(config.encoded);
    }

    workQueue.registerWorker('amumu_encode', amumu, config.limit);

    workQueue.startWorker();
}

main();
