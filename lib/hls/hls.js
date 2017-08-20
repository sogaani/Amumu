"use strict";

const EventEmitter = require('events');
const TsFile = require('./tsfile');
const chokidar = require('chokidar')
const http = require('http');
const fs = require('fs');
const httpUtil = require('../utils/http');


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

        if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir);
        const duration = this.duration;
        const total = program.seconds;
        this.creatingFile = null;

        for (let i = 0, j = duration; j < total; j += duration, i++) {
            const key = this.itof(i);
            this.files[key] = new TsFile(i, this.cacheDir);
        }
    }

    itof(index) {
        return `${('00000' + index).slice(-5)}.ts`;
    }

    getTsByFileName(key) {
        return this.files[key];
    }

    hlsFileNameFormat() {
        return '%05d.ts'
    }

    getPlaylist() {
        const self = this;
        const duration = self.duration;
        const total = self.program.seconds;

        let playlist = PLAYLIST_HEADER

        // videojsで最初のファイルを再生すると止まっちゃう。。
        for (let i = 1, j = 2*duration; j < total; j += duration, i++) {
            playlist +=
                `#EXTINF:${duration}.000000,
${'/api/hls/' + self.id + '/file/' + self.itof(i)}
`;
        }

        playlist += PLAYLIST_FOOTER;

        return playlist;
    }

    _startWatchDir(index) {
        const self = this;

        self.state = STATE.init;
        self.firstCreateFile = self.files[self.itof(index)];

        if (!self.watcher) {
            self.watcher = chokidar.watch(self.cacheDir, {
                ignored: /[\/\\]\.[^\/\\]*$/,
                persistent: true
            });
            self.watcher.on('add', (path) => {
                const m = path.match(/[\/\\](\d{5}\.ts)$/);
                if (m) {
                    const key = m[1];

                    if (self.firstCreateFile === self.files[key]) {
                        self.state = STATE.creating;
                        console.log('first:' + path);
                    }

                    if (self.state === STATE.creating) {
                        if (self.creatingFile) {
                            self.creatingFile.notifiedCreated();
                        }
                        self.creatingFile = self.files[key];
                    }
                }
            });
        }
    }

    startEncode(startIndex) {
        const self = this;

        self._startWatchDir(startIndex);

        let _config = {
            index: startIndex,
            duration: self.duration
        }

        _config = Object.assign(_config, self.config);

        const output = self.cacheDir + self.hlsFileNameFormat();

        self.manager.encodeHls(self.program, _config, output)
            .then(() => {
                if (self.creatingFile) {
                    self.creatingFile.notifiedCreated();
                }
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
    }

    _httpServer(req, res) {
        const self = this;
        try {
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
        } catch (e) {
            httpUtil.resErr(req, res, 500);
            console.log(e);
        }
    }

    createId() {
        return 'test';
    }

    async createHlsStream(programId, config) {
        console.log(programId);
        const self = this;
        const id = self.createId();
        const program = await self.chinachu.getProgramById(programId);

        if (!program) return null;

        this.cache[id] = new Hls(id, program, self.manager, config);
        this.cache[id].startEncode(0);

        return id;
    }

    getHlsById(id) {
        return this.cache[id];
    }
}

module.exports = HlsServer;
