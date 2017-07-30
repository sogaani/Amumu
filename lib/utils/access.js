"use strict";

const child_process = require('child_process');

exports.samba = function (config) {
    if (config.type === 'smb') {
        child_process.execSync('net use ' + config.path.match(/^(.+)\\/)[1] + ' ' + config.authPass + ' /user:' + config.authUser);
    }
}