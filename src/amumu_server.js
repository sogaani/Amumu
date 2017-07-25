"use strict";

const child_process = require('child_process');
const request = require('request-promise-native');
const WorkQueue = require('./work_queue');
const EncodeManager = require('./encoder/manager');
const CONFIG_FILE = __dirname + '/../server_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');
const chinachuReq = request.defaults({ simple: false, followRedirect: true, resolveWithFullResponse: true, });

var manager;
var workQueue;

config.workerLimit = config.workerLimit || 1;
config.deleteEncodedFile = config.deleteEncodedFile || false;
config.replaceRecordedWithEncoded = config.replaceRecordedWithEncoded || false;

async function notifyEncoded(id, recorded) {
    if (config.deleteEncodedFile) {
        var delRes = await chinachuReq.del(config.chinachuPath + 'api/recorded/' + id + '/file.json');

        if (delRes.statusCode !== 200) {
            return Promise.reject(new Error('Failed del request statuscode:' + delRes.statusCode));
        }
    }

    if (config.replaceRecordedWithEncoded) {
        var putRes = await chinachuReq.put({
            uri: config.chinachuPath + 'api/recorded/' + id + '.json',
            form: {
                json: JSON.stringify({ recorded: recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4' })
            }
        });

        if (putRes.statusCode !== 200) {
            return Promise.reject(new Error('Failed put request statuscode:' + putRes.statusCode));
        }
    }
}

async function amumu(job, done) {
    try {
        const id = job.attrs.data.id;
        const recorded = job.attrs.data.recorded;

        await manager.encode(job.attrs.data);
        await notifyEncoded(id, recorded);

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
    workQueue = new WorkQueue(config.mongodbPath);

    workQueue.registerWorker('amumu_encode', amumu, config.limit || 1);

    workQueue.startWorker();
}

function main() {
    manager = new EncodeManager(config.recorded.path, config.encoded.path, config.limit || 1, config.encoder);

    ['encoded', 'recorded'].forEach((element) => {
        var cnf = config[element];
        if (cnf.type === 'smb') {
            child_process.execSync('net use ' + cnf.path.match(/^(.+)\\/)[1] + ' ' + cnf.authPass + ' /user:' + cnf.authUser);
        }
    });

    startEncodeServer();
}

main();
