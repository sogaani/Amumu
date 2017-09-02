/*
MIT License

Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
https://chinachu.moe/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');
const fs = require('fs');
const readFile = require('../utils/fs');
const url = require('url');
const querystring = require('querystring');
const child_process = require('child_process');
const ChinachuClient = require('./client');
const EncoderClient = require('../hls/client');
const Datastore = require('../utils/database');
const WorkQueue = require('../utils/workQueue');
const httpUtil = require('../utils/http');

class ChinachuProxy {
  constructor(chinachuPath, encodedPath, dbPath, encoders, recordingPath) {
    const self = this;

    self.encodedPath = encodedPath;
    self.chinachuPath = chinachuPath;
    self.db = new Datastore(dbPath);
    self.workQueue = new WorkQueue(dbPath);
    self.recordingPath = recordingPath;

    self.encoder = new EncoderClient(encoders);

    self.chinachu = new ChinachuClient(chinachuPath);
    self.passthroughProxy = httpProxy.createProxyServer({ target: chinachuPath, ws: true });

    self.apiProxies = [];

    httpUtil.setupApi(self.apiProxies, __dirname + '/proxy/api/');

    self.server = http.createServer((req, res) => { self._httpServer(req, res) });

    self.server.on('upgrade', function (req, socket, head) {
      self.passthroughProxy.ws(req, socket, head);
    });

  }

  listen(port) {
    this.server.listen(port);
  }

  async _httpServer(req, res) {
    const self = this;
    let isProxied = false;
    try {
      // 1.apiのプロキシー
      const proxy = httpUtil.matchApi(req, self.apiProxies);
      if (proxy) {
        isProxied = true;

        console.log('proxy ' + req.url);

        req.redirect = () => {
          switch (req.method) {
            case 'POST':
            case 'PUT':
            case 'DELETE':
              // bodyを受信済みの場合はリダイレクト
              res.setHeader('Location', req.url.replace(/^\//, '/trans_to_chinachu/'));
              httpUtil.writeHead(res, 307, "");
              res.end();
              break;
            case 'GET':
            case 'HEAD':
            default:
              // bodyを受信していない場合はChinachuへそのまま流す
              self.passthroughProxy.web(req, res);
              break;
          }
        };

        const sandbox = {
          encodedPath: self.encodedPath,
          path: path,
          console: console,
          fs: fs,
          proxy: self.passthroughProxy,
          db: self.db,
          workQueue: self.workQueue,
          child_process: child_process,
          chinachu: self.chinachu,
          encoder: self.encoder,
          recordingPath: self.recordingPath,
          readFile: readFile
        }

        httpUtil.execApi(req, res, proxy, sandbox);
      }

      // 2.webページのプロキシー
      let location = req.url;
      if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
      if (location.match(/\/$/) !== null) { location += 'index.html'; }
      if (!isProxied && fs.existsSync(path.join(__dirname, '/proxy/web', location))) {
        isProxied = true;

        console.log('proxy ' + req.url);

        self._proxyPage(req, res, path.join(__dirname, '/proxy/web', location));
      }

      // 3.chinachuへ転送
      if (!isProxied) {
        console.log('not proxy ' + req.url);
        // chinachuへの転送パスを書き換え
        req.url = req.url.replace(/\/trans_to_chinachu\//, '/');

        self.passthroughProxy.web(req, res);
      }
    } catch (e) {
      httpUtil.resErr(req, res, 500);
      console.log(e);
    }
  }

  _proxyPage(req, res, filename) {
    const self = this;

    if (req.method !== 'HEAD' && req.method !== 'GET') {
      res.setHeader('Allow', 'HEAD, GET');
      return httpUtil.resErr(req, res, 405);
    }

    let ext = null;
    if (filename.match(/[^\/]+\..+$/) !== null) {
      ext = filename.split('.').pop();
    }

    if (['ico', 'png'].indexOf(ext) !== -1) {
      res.setHeader('Cache-Control', 'private, max-age=86400');
    }

    var fstat = fs.statSync(filename);

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Last-Modified', new Date(fstat.mtime).toUTCString());

    if (req.headers['if-modified-since'] && req.headers['if-modified-since'] === new Date(fstat.mtime).toUTCString()) {
      httpUtil.writeHead(res, 304, ext);

      return res.end();
    }

    var range = {};
    if (req.headers.range) {
      var bytes = req.headers.range.replace(/bytes=/, '').split('-');
      range.start = parseInt(bytes[0], 10);
      range.end = parseInt(bytes[1], 10) || fstat.size - 1;

      if (range.start > fstat.size || range.end > fstat.size) {
        return httpUtil.resErr(req, res, 416);
      }

      res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fstat.size);
      res.setHeader('Content-Length', range.end - range.start + 1);

      httpUtil.writeHead(res, 206, ext);

    } else {
      res.setHeader('Content-Length', fstat.size);

      httpUtil.writeHead(res, 200, ext);
    }

    if (req.method === 'GET') {
      fs.createReadStream(filename, range || {}).pipe(res);
    } else {
      res.end();
    }
  }
}

module.exports = ChinachuProxy;