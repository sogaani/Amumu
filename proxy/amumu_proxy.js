"use strict";

const Proxy = require('../lib/chinachu/proxyServer');
const access = require('../lib/utils/access');
const CONFIG_FILE = __dirname + '/../proxy_config.json';
const config = require(CONFIG_FILE);

// 終了処理
process.on('SIGQUIT', () => {
	setTimeout(() => {
		process.exit(0);
	}, 0);
});

// 例外処理
process.on('uncaughtException', (err) => {
	console.error('uncaughtException: ' + err.stack);
});

if (config.encoded.type === 'smb') {
    access.samba(config.encoded);
}

const proxy = new Proxy(config.chinachuPath, config.encoded.path, config.mongodbPath, config.encoders);
proxy.listen(config.port);