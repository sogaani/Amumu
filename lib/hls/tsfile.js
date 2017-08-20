"use strict";

const fs = require('fs');
const httpUtil = require('../utils/http');

const STATE = {
    INITIAL: 0,
    AVAILABLE: 2
}

class TsFile {
    constructor(index, dir) {
        this.file = `${('00000' + index).slice(-5)}.ts`;
        this.dir = dir;
        this.state = STATE.INITIAL;
        this.path = dir + this.file;
    }

    stat() {
        return fs.statSync(this.path);
    }

    getStream(range){
        return fs.createReadStream(this.path, range || {});
    }

    notifiedCreated() {
        this.state = STATE.AVAILABLE;
    }

    isAvailable() {
        return this.state === STATE.AVAILABLE;
    }
}

module.exports = TsFile;
