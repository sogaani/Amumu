"use strict";

const proxy = require('../lib/chinachu/proxyServer');
const access = require('../lib/utils/access');
const CONFIG_FILE = __dirname + '/../server_config.json';
const config = require(CONFIG_FILE);

if (config.encoded.type === 'smb') {
    access.samba(config.encoded);
}

proxy.createChinachuProxy(config.chinachuPath, config.recorded.path, config.encoded.path, config.mongodbPath).listen(config.port);