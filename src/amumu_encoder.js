"use strict";

const request = require('request-promise-native');
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const child_process = require('child_process');
const CONFIG_FILE = __dirname + '/../encoder_config.json';
const config = require(CONFIG_FILE);
const fs = require('fs');
const chinachuReq = request.defaults({simple: false, followRedirect: true, resolveWithFullResponse: true,});

preprocess();
startEncodeServer();

async function encodedRequest(id,recorded){
    var delRes = await chinachuReq.del(config.chinachuPath + 'api/recorded/' + id +'/file.json');

    if (delRes.statusCode !== 200) {
        return Promise.reject(new Error('Failed del request statuscode:' + delRes.statusCode));
    }

    var putRes = await chinachuReq.put({
        uri: config.chinachuPath + 'api/recorded/' + id +'.json',
        form: {
            json: JSON.stringify({recorded: recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4'})
        }
    });

    if (putRes.statusCode !== 200) {
        return Promise.reject(new Error('Failed put request statuscode:' + putRes.statusCode));
    }
}

async function encode(id,recorded){
    var file = recorded.match(/\/([^\/]+?)\.[^\.]+?$/)[1]
    console.log("encode file " + file);

    var output,input;
    input = config.input.path.replace(/<file>/,file).replace(/<id>/,id);
    output = config.output.path.replace(/<file>/,file).replace(/<id>/,id);

    var args = [];
    config.encoder.args.forEach( (element, index, array) => {
        args.push(element.replace(/<input>/,input).replace(/<output>/,output));
    });

    var encoder = child_process.spawn(config.encoder.process,args,{ stdio: ['ignore',1,2]});
    await new Promise((resolve, reject)=>{
        encoder.on('exit',(code) => {
            if ( code != 0 ){
                reject(new Error('Failed encode process code:' + code));
            }else{
                resolve();
            }
        });
    });
}

async function amumu(job,done) {
    var id = job.attrs.data.id;
    var recorded = job.attrs.data.recorded;

    try{
        await encode(id,recorded)
        await encodedRequest(id,recorded)
        console.log("encode end");
        done();
    }catch(err) {
        done(err);
    }
}

function preprocess(){
    ['input','output'].forEach( (element, index, array) => {
        var cnf = config[element];
        if (cnf.type === 'smb') {
            child_process.execSync('net use ' + cnf.path.match(/^(.+)\\/)[1] + ' ' + cnf.authPass + ' /user:' + cnf.authUser);
        }
    });
}

function startEncodeServer() {
    const dboptions = {
        server: {
            socketOptions: {
                socketTimeoutMS: 0,
                connectTimeoutMS: 0
            }
        }
    };
    const agenda = new Agenda({db: { address: config.mongodbPath + 'amumu', collection: 'jobs', options: dboptions}});

    agenda.define('amumu_encode', {concurrency: 1, lockLimit: 1, lockLifetime: 120*60*1000}, (job,done) => amumu(job,done));

    agenda.once('ready', () => agenda.start());
}

