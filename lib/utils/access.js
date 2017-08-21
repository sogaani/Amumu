"use strict";

const fs = require('fs');
const child_process = require('child_process');

function samba(config) {
    if (config.type === 'smb') {
        child_process.execSync('net use ' + config.path.match(/^(.+)\\/)[1] + ' ' + config.authPass + ' /user:' + config.authUser);
    }
}

function unlink(path) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            resolve();
        });
    });
}

function access(path) {
    return new Promise((resolve, reject) => {
        fs.access(path, (err) => {
            resolve(err);
        });
    });
}

function readdir(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            resolve(files);
        });
    });
}

function lstat(path) {
    return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stats) => {
            resolve(stats);
        });
    });
}

function rmdir(path) {
    return new Promise((resolve, reject) => {
        fs.rmdir(path, (err) => {
            resolve(err);
        });
    });
}

async function rm(path, glob) {

    const stat = await lstat(path);

    if (!stat) {
        return;
    } else if (stat.isDirectory()) {

        const files = await readdir(path);
        const fl = files.length;

        for (let i = 0; i < fl; i++) {
            const curPath = path + '/' + files[i];
            const stat = await lstat(curPath);
            await rm(curPath);
        }

        if(!glob) await rmdir(path);

    } else {
        await unlink(path);
    }

}

module.exports = {
    samba: samba,
    rm: rm
}