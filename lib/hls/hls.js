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
#EXT-X-TARGETDURATION:${DURATION + 1}
`;
const PLAYLIST_FOOTER = '#EXT-X-ENDLIST';

const CACHE_DIR = __dirname + '/../../cache/';


const STATE = {
    init: 0,
    creating: 1,
    end: 2,
    fail: 3
}


class Hls extends EventEmitter {
    constructor(id, program, manager, config) {
        super();
        this.state = STATE.init;
        this.config = config;
        this.duration = DURATION;
        this.id = id;
        this.cacheDir = CACHE_DIR + id + '/';
        this.files = [];
        this.program = program;
        this.manager = manager;
        this.timeout = null;

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
        this._refreshDeleteTimeout();
        return this.files[index];
    }

    hlsFileNameFormat() {
        return '%d.ts'
    }

    getPlaylist(baseurl) {
        const self = this;
        const duration = self.duration;

        let playlist = PLAYLIST_HEADER
        const length = this.files.length;
        const id = self.id;

        this._refreshDeleteTimeout();

        // videojsで最初のファイルを再生すると止まっちゃう。。
        for (let i = 1; i < length; i++) {
            playlist +=
                `#EXTINF:${duration}.000000,
${baseurl + '/api/hls/' + id + '/file/' + self.files[i].file}
`;
        }

        playlist += PLAYLIST_FOOTER;

        return playlist;
    }

    _deleteFiles() {
        const self = this;

        if (self.state === STATE.end || self.state === STATE.fail) {
            clearTimeout(self.timeout);
            fsUtil.rm(self.cacheDir);
            self.emit('delete');
        } else {
            self._refreshDeleteInterval();
        }
    }

    _refreshDeleteTimeout() {
        const self = this;

        if (self.timeout !== null) clearTimeout(self.timeout);

        // 最後にアクセスされてから１時間後に削除
        self.timeout = setTimeout(() => {
            self._deleteFiles();
        }, 1000 * 60 * 60);
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
                    const ts = self.getTsByIndex(self.creatingIndex)
                    if (ts) {
                        ts.notifiedCreated();
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
            }, (eventType, filename) => {
                self._handleRename(eventType, filename)
            });
        }
    }

    async startEncode(startIndex) {
        const self = this;
        let status = true;

        if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir);

        self._startWatchDir(startIndex);

        let _config = {
            index: startIndex,
            duration: self.duration
        }

        _config = Object.assign(_config, self.config);

        const output = self.cacheDir + self.hlsFileNameFormat();
        self._refreshDeleteTimeout();

        self.manager.encodeHls(self.program, _config, output)
            .then(() => {
                self.watcher.close();

                const ts = self.getTsByIndex(self.creatingIndex)
                if (ts) {
                    ts.notifiedCreated();
                }
                self.state = STATE.end;
            }).catch(() => {
                self.watcher.close();
                self.state = STATE.fail;
                self._deleteFiles();
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

    getCache(programId, config) {
        for (let key in this.cache) {
            const cache = this.cache[key];
            if (cache.state !== STATE.fail &&
                cache.program.id === programId &&
                cache.config.quality === config.quality &&
                cache.config.size === config.size) {
                return cache;
            }
        }
        return null;
    }

    async createHlsStream(programId, config) {
        const self = this;
        let cache = self.getCache(programId, config);

        if (!cache) {
            const id = self.createId();
            const program = await self.chinachu.getProgramById(programId);

            if (!program) return null;

            cache = new Hls(id, program, self.manager, config);
            self.cache[id] = cache;

            cache.once('delete', () => {
                delete self.cache[id];
            });
            await cache.startEncode(0);
        }
        return `${'/api/hls/' + cache.id + '/playlist.m3u8'}`;
    }

    getHlsById(id) {
        return this.cache[id];
    }
}

module.exports = HlsServer;
