const proxy = require('./proxyServer');
const config = require('../../server_config.json');
const child_process = require('child_process');

['encoded', 'recorded'].forEach((element) => {
    var cnf = config[element];
    if (cnf.type === 'smb') {
        child_process.execSync('net use ' + cnf.path.match(/^(.+)\\/)[1] + ' ' + cnf.authPass + ' /user:' + cnf.authUser);
    }
});
proxy.createChinachuProxy(config.chinachuPath, config.encoded.path, config.mongodbPath).listen(8080);