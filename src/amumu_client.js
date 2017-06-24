const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const CONFIG_FILE = __dirname + '/../config.json';
const config = require(CONFIG_FILE);

async function queue(program) {
    const db = await MongoClient.connect(config.mongodbPath + 'amumu');
    const agenda = new Agenda().mongo(db, 'jobs');

    await new Promise(resolve => agenda.once('ready', resolve()));

    // Schedule a job for 5 seconds from now and `await` until it has been
    // persisted to MongoDB
    await new Promise((resolve, reject) => {
        var job = agenda.create('amumu_encode', {recorded: program.recorded, id: program.id});
        job.save(promiseCallback(resolve, reject));
    });
    process.exit(0);
}

var obj = {};

try {
    obj = JSON.parse(process.argv[3]);
} catch (e) {
    process.exit(-1);
}

queue(obj);

function promiseCallback(resolve, reject) {
return function(error, res) {
    if (error) {
    return reject(error);
    }
    resolve(res);
};
}