const child_process = require('child_process');
const EncoderFactory = require('./factory');
const EncodeManager = require('./manager');
const CONFIG_FILE = __dirname + '/test.json';
const config = require(CONFIG_FILE);
const path = require('path');
const programs = require(__dirname + '/../../data/recorded.json');

config.recorded.path = __dirname + '\\' + config.recorded.path;
config.encoded.path = __dirname + '\\' + config.encoded.path;

var manager = new EncodeManager(config.recorded.path, config.encoded.path, 1, config.encoder);

async function main() {
    try {
        await manager.encode({ 'id': 'test', recorded: './test.m2ts' }).catch((err) => {
            console.log(err);
        });
    } catch (err) {
        console.log(err);
    }
}
main();
