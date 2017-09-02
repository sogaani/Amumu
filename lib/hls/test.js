"use strict";

const WorkQueue = require('../utils/workQueue');
const EncodeManager = require('../encoder/manager');
const ChinachuClient = require('../chinachu/client');
const access = require('../utils/access');
const HlsServer = require('./hls');

const CONFIG_FILE = __dirname + '/../../encoder_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');

var manager;
var chinachu;
var hlsServer;
var workQueue;
config.limit = config.limit || 1
config.deleteEncodedFile = config.deleteEncodedFile || false;

function test(job, done) {
    done(err);
}

function main() {
    manager = new EncodeManager(config.encoded.path, config.limit, config.encoder, config.chinachuPath, config.mongodbPath);
    chinachu = new ChinachuClient(config.chinachuPath);
    hlsServer = new HlsServer(chinachu, manager);
    workQueue = new WorkQueue(config.mongodbPath);
    if (config.encoded.type === 'smb') {
        access.samba(config.encoded);
    }
    //hlsServer.createHlsStream('381ocd82uf');

}

main();