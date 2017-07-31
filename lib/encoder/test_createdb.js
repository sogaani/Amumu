const Datastore = require('../utils/database');
const config = require('../../encoder_config.json');
const path = require('path');

var remote = new Datastore(config.mongodbPath);
var local = new Datastore();

async function main() {
    const programs = await local.getPrograms()

    programs.forEach(async (element) => {
        await remote.pushProgram(element);
    });
}
main();