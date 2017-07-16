const child_process = require('child_process');
const EncoderFactory = require('./factory');
const CONFIG_FILE = __dirname + '/test.json';
const config = require(CONFIG_FILE);

config.input.path = __dirname + '\\' + config.input.path;
config.output.path = __dirname + '\\' + config.output.path;

var encoder = EncoderFactory(config);
async function main(){
try {
    await encoder.exec(null);
} catch (err) {
    console.log(err);
}
}
main();