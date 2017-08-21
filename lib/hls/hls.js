"use strict";

const EventEmitter = require('events');
const TsFile = require('./tsfile');
const http = require('http');
const fs = require('fs');
const httpUtil = require('../utils/http');
const fsUtil = require('../utils/access');

const DURATION = 5;

const PLAYLIST_HEADER =
    `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:${DURATION + 1}
`;
const PLAYLIST_FOOTER = '#EXT-X-ENDLIST';

const CACHE_DIR = __dirname + '/../../cache/';


const STATE = {
    init: 0,
    creating: 1,
    end: 2
}


class Hls {
    constructor(id, program, manager, config) {
        this.state = STATE.init;
        this.config = config;
        this.duration = DURATION;
        this.id = id;
        this.cacheDir = CACHE_DIR + id + '/';
        this.files = [];
        this.program = program;
        this.manager = manager;

        const duration = this.duration;
        const total = program.seconds;
        this.creatingIndex = -1;
        this.firstCreateIndex = -1;
        this.watcher = null;

        for (let i = 0, j = 0; j < total; j += duration, i++) {
            this.files[i] = new TsFile(i, this.cacheDir);
        }
    }

    itof(index) {
        return `${index}.ts`;
    }

    getTsByIndex(index) {
        if (this.files.length <= index || 0 > index) {
            return null;
        }
        return this.files[index];
    }

    hlsFileNameFormat() {
        return '%d.ts'
    }

    getPlaylist(baseurl) {
        const self = this;
        const duration = self.duration;
        const total = self.program.seconds;

        let playlist = PLAYLIST_HEADER

        // videojsで最初のファイルを再生すると止まっちゃう。。
        for (let i = 1, j = duration; j < total; j += duration, i++) {
            playlist +=
                `#EXTINF:${duration}.000000,
${baseurl + '/api/hls/' + self.id + '/file/' + self.files[i].file}
`;
        }

        playlist += PLAYLIST_FOOTER;

        return playlist;
    }


    _handleRename(eventType, filename) {
        const self = this;

        if (eventType == 'rename') {
            const path = self.cacheDir + filename;
            const m = path.match(/[\/\\]([0-9]+\.ts)$/);
            if (m) {
                const _index = parseInt(m[1], 10);

                if (self.firstCreateIndex === _index) {
                    self.state = STATE.creating;
                }

                if (self.state === STATE.creating) {
                    if (self.creatingIndex >= 0) {
                        self.getTsByIndex(self.creatingIndex).notifiedCreated();
                    }
                    self.creatingIndex = _index;
                }
            }
        }
    }

    _startWatchDir(index) {
        const self = this;

        self.firstCreateIndex = index;

        if (!self.watcher) {
            self.watcher = fs.watch(self.cacheDir, {
                persistent: true,
                recursive: true
            }, (eventType, filename) => { self._handleRename(eventType, filename) });
        }
    }

    startEncode(startIndex) {
        const self = this;

        if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir);

        self._startWatchDir(startIndex);

        let _config = {
            index: startIndex,
            duration: self.duration
        }

        _config = Object.assign(_config, self.config);

        const output = self.cacheDir + self.hlsFileNameFormat();

        self.manager.encodeHls(self.program, _config, output)
            .then(() => {
                const ts = self.getTsByIndex(self.creatingIndex)
                if (ts) {
                    ts.notifiedCreated();
                }
                self.state = STATE.init;

                // 動画時間×３経ったらcache削除
                setTimeout(()=>{fsUtil.rm(self.cacheDir);}, 1000 * this.program.seconds * 3);
            });
    }
}

const HlsPort = 30782;

class HlsServer {
    constructor(chinachu, manager) {
        const self = this;
        self.chinachu = chinachu;
        self.manager = manager;

        self.cache = {};
        self.server = http.createServer((req, res) => { self._httpServer(req, res) });
        self.server.listen(HlsPort);

        self.apis = [];

        httpUtil.setupApi(this.apis, __dirname + '/api/');

        fsUtil.rm(CACHE_DIR, true)
    }

    _httpServer(req, res) {
        const self = this;
        const api = httpUtil.matchApi(req, self.apis);
        if (api) {
            const sandbox = {
                console: console,
                hls: self
            }

            httpUtil.execApi(req, res, api, sandbox);

        } else {
            httpUtil.resErr(req, res, 404);
        }
    }

    // 8文字の乱数生成
    createId() {
        const c = "abcdefghijklmnopqrstuvwxyz0123456789";

        const cl = c.length;
        let r = '';
        for (var i = 0; i < 8; i++) {
            r += c[Math.floor(Math.random() * cl)];
        }
        return r;
    }

    async createHlsStream(programId, config) {
        console.log(programId);
        const self = this;
        const id = self.createId();
        const program = await self.chinachu.getProgramById(programId);

        if (!program) return null;

        this.cache[id] = new Hls(id, program, self.manager, config);
        this.cache[id].startEncode(0);

        return `${'/api/hls/' + id + '/playlist.m3u8'}`;
    }

    getHlsById(id) {
        return this.cache[id];
    }
}

module.exports = HlsServer;
