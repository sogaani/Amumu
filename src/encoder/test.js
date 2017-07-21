const child_process = require('child_process');
const EncoderFactory = require('./factory');
const CONFIG_FILE = __dirname + '/test.json';
const config = require(CONFIG_FILE);

config.recorded.path = __dirname + '\\' + config.recorded.path;
config.encoded.path = __dirname + '\\' + config.encoded.path;

var encoder = EncoderFactory(config);
async function main(){
try {
    await encoder.exec('test.m2ts');
} catch (err) {
    console.log(err);
}
}
main();