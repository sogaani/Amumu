"use strict";

const child_process = require('child_process');
const request = require('request-promise-native');
const WorkQueue = require('./work_queue');
const EncodeManager = require('./encoder/manager');
const ChinachuClient = require('./chinachu/client');
const CONFIG_FILE = __dirname + '/../server_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');
const chinachuReq = request.defaults({ simple: false, followRedirect: true, resolveWithFullResponse: true, });

var manager;
var workQueue;
var chinachu;

config.workerLimit = config.workerLimit || 1;
config.deleteEncodedFile = config.deleteEncodedFile || false;
config.replaceRecordedWithEncoded = config.replaceRecordedWithEncoded || false;

async function amumu(job, done) {
    try {
        const id = job.attrs.data.program.id;
        const recorded = job.attrs.data.program.recorded;

        await manager.encode(job.attrs.data.program, job.attrs.data.config);
        if(config.deleteEncodedFile) await chinachu.deleteFile(id);

        console.log("encode end");
        done();

    } catch (err) {
        console.log(err);
        workQueue.queueJob('amumu_encode', job.attrs.data, {}, () => {
            done(err);
        });
    }
}

function startEncodeServer() {
    workQueue.registerWorker('amumu_encode', amumu, config.limit || 1);

    workQueue.startWorker();
}

function main() {
    workQueue = new WorkQueue(config.mongodbPath);
    manager = new EncodeManager(config.recorded.path, config.encoded.path, config.limit || 1, config.encoder, config.chinachuPath);
    chinachu = new ChinachuClient(config.chinachuPath);

    ['encoded', 'recorded'].forEach((element) => {
        var cnf = config[element];
        if (cnf.type === 'smb') {
            child_process.execSync('net use ' + cnf.path.match(/^(.+)\\/)[1] + ' ' + cnf.authPass + ' /user:' + cnf.authUser);
        }
    });

    startEncodeServer();
}

main();
