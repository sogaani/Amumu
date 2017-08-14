"use strict";

const EventEmitter = require('events');
const TsFile = require('./tsfile');
const chokidar = require('chokidar')

const PLAYLIST_HEADER =
    `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-ALLOW-CACHE:YES
#EXT-X-TARGETDURATION:6
`;
const PLAYLIST_FOOTER = '#EXT-X-ENDLIST';

const baseurl = '/api/hls/'
const CACHE_DIR = __dirname + '/../../cache/';

class Hls extends EventEmitter {
    constructor(id, program, duration, encoder) {
        super();
        this.duration = duration;
        this.cacheDir = CACHE_DIR + id + '/';
        this.baseurl = baseurl + id + '/';
        this.files = [];
        this.program = program;
        this.encoder = encoder;
    }

    convertIndexToFileString(index) {
        return `${('00000' + index).slice(-5)}.ts`;
    }

    getPlaylist() {
        const self = this;
        const duration = self.duration;
        const total = self.program.time;
        let ret = HEADER

        for (let i = 0, j = duration; j < total; j += duration, i++) {
            ret +=
                `#EXTINF:${duration}.000000,
${self.baseurl + self.convertIndexToFileString(i)}
`;
        }

        ret += FOOTER;

        return ret;
    }

    api(url) {
        const m = url.match(/\/(\d{5}\.ts)$/);
        if (m) {
            const key = m[1];
            const tsfile = selt.files[key];
            if(!tsfile){

            }
            if(!tsfile.isAvailable() && tsfile !== self.creatingFile){
                // 既存のエンコード
                // エンコード処理
self.creatingFile = tsfile; // このファイルを作成中
                // timeoutで再度呼び出し // 長めのtimeoutにしておく？
            }else if(tsfile !== self.creatingFile){
                // timeoutで再度呼び出し
            }
        }
    }

    _startEncode(duration, total) {
        const self = this;
        const duration = self.duration;
        const total = self.program.time;
        let ret = HEADER;
        this.creatingFile = null;

        for (let i = 0, j = duration; j < total; j += duration, i++) {
            const key = self.convertIndexToFileString(i);
            self.files[key] = new TsFile(i, self.baseurl);
        }

        this.watcher = chokidar.watch(this.cacheDir, {
            ignored: /[\/\\]\.[^\/\\]*$/,
            persistent: true
        });

        this.watcher.on('add', (path) => {
            const m = path.match(/\/(\d{5}\.ts)$/);
            if (m) {
                const key = m[1];
                if (self.creatingFile) {
                    self.creatingFile.notifiedCreated();
                }
                self.creatingFile = selt.files[key];
            }
        })

        return ret;
    }
}

class HlsServer extends EventEmitter {
    constructor() {
        super();
        this.cache = [];
    }

    newEncode(request, response) {
        getRandString();

    }

    getURL(baseUrl, no) {
        return `${url}/${('00000' + i).slice(-5)}.ts`;
    }

    getPlaylist(url, duration, total) {

        let ret = HEADER

        for (let i = 0, j = duration; j < total; j += duration, i++) {
            ret +=
                `#EXTINF:${duration}.000000,
${getURL(url, i)}
`;
        }

        ret += FOOTER;

        return ret;
    }
}