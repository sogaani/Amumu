const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const child_process = require('child_process');
const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);

async function run() {
    const db = await MongoClient.connect(config.mongodbPath + 'amumu');
    const agenda = new Agenda().mongo(db, 'jobs');

    child_process.execSync('net use ' + config.recordedPath + ' ' + config.remoteAuthPass + ' /user:' + config.remoteAuthUser);

    async function checkCancelled(job) {
        const count = await db.collection('jobs').count({ _id: job.attrs._id });
        return !(count > 0);
    }

    function failJob(job,err) {
        job.fail(err);
        job.save();
    }

    agenda.define('amumu_encode', async function(job)  {
        if (await checkCancelled(job)) {
            return;
        }
        var args = [];

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

        var ffmpeg = child_process.spawnSync('ffmpeg',args,{ stdio: 'inherit' });
        if ( ffmpeg.status != 0 ){
            failJob(job,'fail ffmpeg');
            return;
        }

        var request = require('request')

        var obj = {
            recorded:   job.attrs.data.recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4'
        };

        var delopts = {
            url: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'/file.m2ts',
            method: 'DELETE'
        }
        var putopts = {
            url: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'.json',
            method: 'PUT',
            qs: {
                json: JSON.stringify(obj)
            }
        }
        var status = true;

        await new Promise((resolve, reject) => {
            request(delopts, promiseCallback(resolve, reject));
        }).catch(function (error) {
            failJob(job,error);
            status = false;
        });

        if(!status) return;

        await new Promise((resolve, reject) => {
            request(putopts, promiseCallback(resolve, reject));
        }).catch(function (error) {
            failJob(job,error);
        });
    });

    await new Promise(resolve => agenda.once('ready', resolve()));

    agenda.start();
}

run();

function promiseCallback(resolve, reject) {
    return function(error, res) {
        if (error) {
        return reject(error);
        }
        resolve(res);
    };
}

