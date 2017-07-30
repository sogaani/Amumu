"use strict";

const WorkQueue = require('../lib/utils/workQueue');
const CONFIG_FILE = __dirname + '/../client_config.json';
const config = require(CONFIG_FILE);

var program = {};

try {
    program = JSON.parse(process.argv[2]);
} catch (e) {
    process.exit(-1);
}

const workQueue = new WorkQueue(config.mongodbPath);

const data = {
    program: program,
    config: { original: true }
};

workQueue.queueJob('amumu_encode', data, {}, (err) => {
    process.exit(0);
});
