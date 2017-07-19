const proxy = require('./proxyServer');

proxy.createChinachuProxy('http://192.168.11.5:10772').listen(8080);