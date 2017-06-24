const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const CONFIG_FILE = __dirname + '/../client_config.json';
const config = require(CONFIG_FILE);

function queue(program) {
    const db = MongoClient.connect(config.mongodbPath + 'amumu',function(err, db) {
        const agenda = new Agenda().mongo(db, 'jobs');

        agenda.once('ready', function() {
            var job = agenda.create('amumu_encode', {recorded: program.recorded, id: program.id});
            job.save(function(err) {
                process.exit(0);
            });
        });
    });
}

var obj = {};

try {
    obj = JSON.parse(process.argv[3]);
} catch (e) {
    process.exit(-1);
}

queue(obj);
