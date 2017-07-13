"use strict";

const WorkQueue = require('./work_queue');
const CONFIG_FILE = __dirname + '/../client_config.json';
const config = require(CONFIG_FILE);

var program = {};

try {
    program = JSON.parse(process.argv[2]);
} catch (e) {
    process.exit(-1);
}

const workQueue = new WorkQueue(config.mongodbPath);

workQueue.queueJob('amumu_encode', { recorded: program.recorded, id: program.id }, (err) => {
    process.exit(0);
});
