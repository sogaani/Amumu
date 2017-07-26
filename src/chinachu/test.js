const proxy = require('./proxyServer');
const config = require('../../server_config.json');
const EncodeManager = require('../encoder/manager');
const child_process = require('child_process');
const WorkQueue = require('../work_queue');

const workQueue = new WorkQueue(config.mongodbPath);
const manager = new EncodeManager(config.recorded.path, config.encoded.path, 1, config.encoder);

['encoded', 'recorded'].forEach((element) => {
    var cnf = config[element];
    if (cnf.type === 'smb') {
        child_process.execSync('net use ' + cnf.path.match(/^(.+)\\/)[1] + ' ' + cnf.authPass + ' /user:' + cnf.authUser);
    }
});
proxy.createChinachuProxy(config.chinachuPath, config.recorded.path, config.encoded.path, manager, workQueue).listen(8080);