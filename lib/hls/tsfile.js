"use strict";

const fs = require('fs');
const httpUtil = require('../utils/http');

const STATE = {
    INITIAL: 0,
    AVAILABLE: 2
}

class TsFile {
    constructor(no, baseurl, dir) {
        this.baseurl = baseurl;
        this.file = `${('00000' + no).slice(-5)}.ts`;
        this.dir = dir;
        this.state = STATE.INITIAL;
    }

    getUrl() {
        return this.baseurl + this.file;
    }

    stream(request, response) {

        if(!this.isAvalable()){
            return httpUtil.resErr(request,response, 404);
        }

        console.log('STREAMING: ' + request.url);

        const path = this.dir + this.file;
        // Caluculate Total Size
        const stat = fs.statSync(path);
        const size = stat.size;

        // Ranges Support
        var range = {
            start: 0
        };

        if (request.headers.range) {
            var bytes = request.headers.range.replace(/bytes=/, '').split('-');
            var rStart = parseInt(bytes[0], 10);
            var rEnd = parseInt(bytes[1], 10) || size - 1;

            range.start = rStart;
            range.end = rEnd;

            response.setHeader('Accept-Ranges', 'bytes');
            response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + size);
            response.setHeader('Content-Length', rEnd - rStart + 1);

            httpUtil.writeHead(response,206,'ts');
        } else {
            response.setHeader('Accept-Ranges', 'bytes');
            response.setHeader('Content-Length', size);

            httpUtil.writeHead(response,200,'ts');
        }

        var readStream = fs.createReadStream(path, range || {});

        request.on('close', () => {
            readStream.destroy();
            readStream = null;
        });

        readStream.pipe(response);

        return;
    }

    notifiedCreated() {
        this.state = STATE.AVAILABLE;
    }

    isAvalable() {
        return this.state === STATE.AVAILABLE;
    }
}

module.exports = TsFile;
