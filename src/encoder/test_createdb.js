
const EncodeManager = require('./manager');
const config = require('../../server_config.json');
const path = require('path');
const programs = require(__dirname + '/../../data/recorded.json');

var manager = new EncodeManager(config.recorded.path, config.encoded.path, 1, config.encoder);

programs.forEach(async (element) => {
    const type = element.recorded.match(/\.([^.]+?)$/)[1];
    if (type === 'mp4') {
        element.recorded = path.join(config.encoded.path, element.recorded.match(/\/([^/]+?)$/)[1]);
        element.encoded = [];
        await manager._pushEncoded(element, {});
    }
});
