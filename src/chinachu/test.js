const proxy = require('./proxyServer');
const config = require('../../server_config.json');

proxy.createChinachuProxy(config.chinachuPath, config.recorded.path, config.encoded.path).listen(8080);