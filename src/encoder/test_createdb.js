
const EncodeManager = require('./manager');
const config = require('../../server_config.json');
const path = require('path');
const programs = require(__dirname + '/../../data/recorded.json');

var manager = new EncodeManager(config.recorded.path, config.encoded.path, 1, config.encoder, config.chinachuPath);

programs.forEach(async (element) => {
    const type = element.recorded.match(/\.([^.]+?)$/)[1];
    if (type === 'mp4') {
        const encoded = {
            file: element.recorded.match(/\/([^/]+?)$/)[1],
            config: {
                quality: "medium"
            }
        }
        await manager._pushEncoded(element, encoded, true);
    }
});
