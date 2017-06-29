"use strict";

const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const child_process = require('child_process');
const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);
require('request').debug = true;
const request = require('request');

async function run() {
    const db = await MongoClient.connect(config.mongodbPath + 'amumu',{
        server: {
            socketOptions: {
                socketTimeoutMS: 0,
                connectTimeoutMS: 0
            }
        }
    });
    const agenda = new Agenda(config.mongodbPath + 'amumu').mongo(db, 'jobs');

    child_process.execSync('net use ' + config.recordedPath + ' ' + config.remoteAuthPass + ' /user:' + config.remoteAuthUser);

    async function checkCancelled(job) {
        const count = await db.collection('jobs').count({ _id: job.attrs._id });
        return !(count > 0);
    }

    async function failJob(job,err) {
        job.fail(err);
        await new Promise(resolve => job.save(resolve()));
    }

    agenda.define('amumu_encode', async job =>  {
        try {
        if (await checkCancelled(job)) {
            return;
        }
        var args = [];
        console.log("encode start");
        var file = job.attrs.data.recorded.match(/\/([^\/]+?)\.[^\.]+?$/)[1]
        var server = config.recordedPath + "\\";
        args.push('-y');
        args.push('-i', server + file + '.m2ts');
        args.push('-c:v', 'h264_qsv');
        args.push('-global_quality', '27');
        args.push('-bf', '2');
        args.push('-look_ahead', '0');
        args.push('-c:a', 'aac');
        args.push( server + file + '.mp4');

        var ffmpeg = child_process.spawnSync('ffmpeg',args,{ stdio: 'ignore' });
        if ( ffmpeg.status != 0 ){
            console.log("encode fail");
            failJob(job,'fail ffmpeg');
            return;
        }
        console.log("encode end");

        var obj = {
            recorded:   job.attrs.data.recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4'
        };

        var delopts = {
            uri: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'/file.json',
            method: 'DELETE',
            timeout: 30 * 1000,
            agent: false
        };
        var putopts = {
            uri: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'.json',
            method: 'PUT',
            timeout: 30 * 1000,
            agent: false,
            form: {
                json: JSON.stringify(obj)
            }
        };
        var status = true;

        request(delopts,requestCallback);

        request(putopts,requestCallback);
        } catch (err) {
            console.error(`oops!` + err);
        }
    });

    await new Promise(resolve => agenda.once('ready', resolve()));

    agenda.start();
}

run();

function requestCallback(error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body);
  }
}

function promiseCallback(resolve, reject) {
    return function(error, res) {
        if (error) {
        return reject(error);
        }
        resolve(res);
    };
}

