"use strict";


const stream = require('stream');
const fs = require('fs');
const path = require('path');

class ContinueFileStream extends stream.Readable {
    constructor(filename, options) {
        super({});
        const self = this;
        self.filename = filename;
        self.readLen = options.start || 0;
        self.end = options.end || 0;
        self.readPrev = 0;
        self.count = 0;
        self.destroyed = false;
        self.timeout = null;
        self.watcher = null;


        self.watcher = fs.watch(self.filename, {
            persistent: true
        }, (eventType) => {
            self._onChange();
        });

        // Windowsのsambaだとfs.watchが動作しないためwatchFileにする
        self.watcher.once('error', (e) => {
            fs.watchFile(self.filename, {
                persistent: true,
                interval: 2000
            }, (curr, prev) => {
                self._onChange();
            });
        });

        self.reopen();
    }


    _onChange() {
        if (this.destroyed)
            return;

        if (this.timeout)
            clearTimeout(this.timeout);

        if (this.readStream === null)
            this.reopen();
    }

    destroy() {
        this.destroyed = true;
        if (this.watcher) {
            this.watcher.close();
        } else {
            fs.unwatchFile(this.filename);
        }
        if (this.readStream) this.readStream.destroy();
        super.destroy();
    }

    reopen() {
        const self = this;
        self.readStream = fs.createReadStream(self.filename, { start: self.readLen });
        self.readStream.on('data', (chunk) => {
            self.readLen += chunk.length;

            if (!self.push(chunk))
                self.readStream.pause();

            if (self.end && self.readLen >= self.end) {
                self.destroy();
            }
        });

        self.readStream.on('end', () => {
            self.readStream.destroy();
            self.readStream = null;
            if (self.destroyed) return;

            self.timeout = setTimeout(() => { self.destroy() }, 60000);
        });
    }

    _read(size) {
        if (this.readStream) this.readStream.resume();
    }

}


module.exports = ContinueFileStream;