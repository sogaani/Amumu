"use strict";

const request = require('request');
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const child_process = require('child_process');
const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);


function run() {
    var dboptions = {
        server: {
            socketOptions: {
                socketTimeoutMS: 0,
                connectTimeoutMS: 0
            }
        }
    };
    const agenda = new Agenda({db: { address: config.mongodbPath + 'amumu', collection: 'jobs', options: dboptions}});

    child_process.execSync('net use ' + config.recordedPath + ' ' + config.remoteAuthPass + ' /user:' + config.remoteAuthUser);

    agenda.define('amumu_encode', {concurrency: 1, lockLimit: 1, lockLifetime: 120*60*1000},(job,done) =>  {
        try {

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

        var ffmpeg = child_process.spawn('ffmpeg',args,{ stdio: 'ignore' });
        ffmpeg.on('exit', function(code) {
            if ( code != 0 ){
                console.log("encode fail");
                job.fail(code);
                job.save(() => done());
                return;
            }
            var obj = {
                recorded:   job.attrs.data.recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4'
            };

            var delopts = {
                uri: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'/file.json',
                method: 'DELETE',
                followRedirect: true
            };
            var putopts = {
                uri: config.chinachuPath + 'api/recorded/' + job.attrs.data.id +'.json',
                method: 'PUT',
                followRedirect: true,
                form: {
                    json: JSON.stringify(obj)
                }
            };

            request(delopts, (err, response, body) => {
                if (!err){
                    request(putopts, (err, response, body) => {
                        if (!err){
                            console.log("encode end");
                            done();
                        }else{
                            console.log("put fail " + err);
                            job.fail(err);
                            job.save(() => done());
                        }
                    });
                }else{
                    console.log("del fail " + err);
                    job.fail(err);
                    job.save(() => done());
                }
            });
        });

        } catch (err) {
            done();
            console.error('oops! ' + err);
        }
    });

    agenda.once('ready', () => agenda.start());
}

run();

