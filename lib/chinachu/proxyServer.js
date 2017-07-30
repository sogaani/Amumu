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
const vm = require('vm');
const url = require('url');
const querystring = require('querystring');
const child_process = require('child_process');
const ChinachuClient = require('./client');
const Datastore = require('../utils/database');
const WorkQueue = require('../utils/workQueue');

exports.createChinachuProxy = (chinachuPath, encodedPath, dbPath) => {
  return new ChinachuProxy(chinachuPath, encodedPath, dbPath);
}

class ChinachuProxy {
  constructor(chinachuPath, encodedPath, dbPath) {
    const self = this;
    self.encodedPath = encodedPath;
    self.chinachuPath = chinachuPath;
    self.db = new Datastore(dbPath);
    self.workQueue = new WorkQueue(dbPath);

    self.chinachu = new ChinachuClient(chinachuPath);
    self.passthroughProxy = httpProxy.createProxyServer({ target: chinachuPath, ws: true });

    self.apiProxies = [];

    fs.readdir(__dirname + '/proxy/api', (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        let pattern = new RegExp('^/' + file.replace(/-/g, '/').replace(/\.[^\.]+?$/g, '\.[^\.]+?$').replace(/@[^\/]+/g, '([^/]+)'));
        let k = file.match(new RegExp(file.replace(/@[^-]+/g, '([^-]+)')));
        let param = [];
        for (let i = 0; i < k.length; i++) {
          param.push(k[i].replace('@', ''));
        }

        let proxy = {
          pattern: pattern,
          file: __dirname + '/proxy/api/' + file,
          param: param
        }
        self.apiProxies.push(proxy);
      });
    });

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

      const length = self.apiProxies.length;
      for (let i = 0; i < length; i++) {
        const proxy = self.apiProxies[i];
        if (req.url.match(proxy.pattern) !== null) {
          try {
            isProxied = true;

            // ヘッダの確認
            if (!req.headers.host) { return self._resErr(req, res, 400); }

            let query = await self._parseQuery(req);

            // HTTPメソッド指定を上書き
            if (query.method) {
              req.method = query.method.toUpperCase();
              delete query.method;
            }

            console.log('proxy ' + req.url);

            self._proxyApi(req, res, query, proxy);

            break;
          } catch (e) {
            self._resErr(req, res, 500);
            console.log(e);
          }
        }
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
        self.passthroughProxy.web(req, res);
      }
    } catch (e) {
      self._resErr(req, res, 500);
      console.log(e);
    }
  }

  async _parseQuery(req) {
    const self = this;
    let q = '';

    switch (req.method) {
      case 'GET':
      case 'HEAD':

        q = url.parse(req.url, false).query || '';

        if (q.match(/^\{.*\}$/) === null) {
          q = querystring.parse(q);
        } else {
          try {
            q = JSON.parse(q);
          } catch (e) {
            q = {};
          }
        }
        return q;

      case 'POST':
      case 'PUT':
      case 'DELETE':

        req.on('data', (chunk) => {
          q += chunk.toString();
        });

        await new Promise((resolve, reject) => {
          req.once('end', () => {
            if (q.trim().match(/^\{(\n|.)*\}$/) === null) {
              q = querystring.parse(q);
            } else {
              try {
                q = JSON.parse(q.trim());
              } catch (e) {
                q = {};
              }
            }
            resolve();
          });
        });

        return q;

      default:
        return {};
    }
  }

  _proxyPage(req, res, filename) {
    const self = this;

    if (req.method !== 'HEAD' && req.method !== 'GET') {
      res.setHeader('Allow', 'HEAD, GET');
      return self._resErr(req, res, 405);
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
      self._writeHead(res, 304, ext);

      return res.end();
    }

    var range = {};
    if (req.headers.range) {
      var bytes = req.headers.range.replace(/bytes=/, '').split('-');
      range.start = parseInt(bytes[0], 10);
      range.end = parseInt(bytes[1], 10) || fstat.size - 1;

      if (range.start > fstat.size || range.end > fstat.size) {
        return self._resErr(req, res, 416);
      }

      res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fstat.size);
      res.setHeader('Content-Length', range.end - range.start + 1);

      self._writeHead(res, 206, ext);

    } else {
      res.setHeader('Content-Length', fstat.size);

      self._writeHead(res, 200, ext);
    }

    if (req.method === 'GET') {
      fs.createReadStream(filename, range || {}).pipe(res);
    } else {
      res.end();
    }
  }

  _proxyApi(req, res, query, proxy) {
    const self = this;

    let param = {}

    for (let i = 1; i < proxy.param.length; i++) {
      param[proxy.param[i]] = req.url.match(proxy.pattern)[i];
    }

    let location = req.url;
    if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }

    let ext = null;
    if (location.match(/[^\/]+\..+$/) !== null) {
      ext = location.split('.').pop();
    }


    if (query._method) {
      req.method = query._method.toUpperCase();
      delete query._method;
    }

    /*
        res._end = res.end;
        res.end = function () {
          res.end = res._end;
          res.end.apply(res, arguments);
          res.emit('end');
        };
    */

    let sandbox = {
      request: req,
      response: res,
      encodedPath: self.encodedPath,
      path: path,
      console: console,
      fs: fs,
      proxy: self.passthroughProxy,
      db: self.db,
      workQueue: self.workQueue,
      child_process: child_process,
      chinachu: self.chinachu,
      setInterval: setInterval,
      setTimeout: setTimeout,
      clearInterval: clearInterval,
      clearTimeout: clearTimeout,
      children: []
    };

    let isClosed = false;

    const onResponseClose = () => {

      if (!isClosed) {
        isClosed = true;
      }

      self._cleanup(sandbox, res, onResponseClose);
    };



    sandbox.request.query = query;
    sandbox.request.param = param;
    sandbox.request.type = ext;
    sandbox.response.head = (code) => {
      self._writeHead(res, code, ext);
    };
    sandbox.response.error = (code) => {
      isClosed = true;

      self._resErr(req, res, code);

      self._cleanup(sandbox, res, onResponseClose);
    };


    res.on('close', onResponseClose);
    res.on('finish', onResponseClose);

    try {
      vm.runInNewContext(fs.readFileSync(proxy.file), sandbox, proxy.file);
    } catch (ee) {
      if (!isClosed) {
        self._resErr(req, res, 500);
        isClosed = true;
      }

      console.error(ee);
    }
  }

  _resErr(req, res, code) {

    if (res.headersSent === false) {
      res.writeHead(code, { 'content-type': 'text/plain' });

      if (req.method !== 'HEAD') {
        switch (code) {
          case 400:
            res.write('400 Bad Request\n');
            break;
          case 402:
            res.write('402 Payment Required\n');
            break;
          case 401:
            res.write('401 Unauthorized\n');
            break;
          case 403:
            res.write('403 Forbidden\n');
            break;
          case 404:
            res.write('404 Not Found\n');
            break;
          case 405:
            res.write('405 Method Not Allowed\n');
            break;
          case 406:
            res.write('406 Not Acceptable\n');
            break;
          case 407:
            res.write('407 Proxy Authentication Required\n');
            break;
          case 408:
            res.write('408 Request Timeout\n');
            break;
          case 409:
            res.write('409 Conflict\n');
            break;
          case 410:
            res.write('410 Gone\n');
            break;
          case 411:
            res.write('411 Length Required\n');
            break;
          case 412:
            res.write('412 Precondition Failed\n');
            break;
          case 413:
            res.write('413 Request Entity Too Large\n');
            break;
          case 414:
            res.write('414 Request-URI Too Long\n');
            break;
          case 415:
            res.write('415 Unsupported Media Type\n');
            break;
          case 416:
            res.write('416 Requested Range Not Satisfiable\n');
            break;
          case 417:
            res.write('417 Expectation Failed\n');
            break;
          case 429:
            res.write('429 Too Many Requests\n');
            break;
          case 451:
            res.write('451 Unavailable For Legal Reasons\n');
            break;
          case 500:
            res.write('500 Internal Server Error\n');
            break;
          case 501:
            res.write('501 Not Implemented\n');
            break;
          case 502:
            res.write('502 Bad Gateway\n');
            break;
          case 503:
            res.write('503 Service Unavailable\n');
            break;
        }
      }
      console.log(code);
    } else {
      console.log(res.statusCode + '(!' + code + ')');
    }
    res.end();
  };

  _writeHead(res, code, ext) {
    var type = 'text/plain';

    if (ext === 'html') { type = 'text/html'; }
    if (ext === 'js') { type = 'text/javascript'; }
    if (ext === 'css') { type = 'text/css'; }
    if (ext === 'ico') { type = 'image/vnd.microsoft.icon'; }
    if (ext === 'cur') { type = 'image/vnd.microsoft.icon'; }
    if (ext === 'png') { type = 'image/png'; }
    if (ext === 'gif') { type = 'image/gif'; }
    if (ext === 'jpg') { type = 'image/jpeg'; }
    if (ext === 'f4v') { type = 'video/mp4'; }
    if (ext === 'm4v') { type = 'video/mp4'; }
    if (ext === 'mp4') { type = 'video/mp4'; }
    if (ext === 'flv') { type = 'video/x-flv'; }
    if (ext === 'webm') { type = 'video/webm'; }
    if (ext === 'm2ts') { type = 'video/MP2T'; }
    if (ext === 'asf') { type = 'video/x-ms-asf'; }
    if (ext === 'json') { type = 'application/json; charset=utf-8'; }
    if (ext === 'xspf') { type = 'application/xspf+xml'; }

    var head = {
      'Content-Type': type,
      'Server': 'Amumu (Node)',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-UA-Compatible': 'IE=Edge,chrome=1',
      'X-XSS-Protection': '1; mode=block'
    };

    res.writeHead(code, head);
  };

  _cleanup(sandbox, res, handle) {

    setTimeout(() => {

      sandbox.children.forEach((proc) => {

        try {
        } catch (e) {
        }
      });

      sandbox = null;
    }, 1000);

    res.removeListener('close', handle);
    res.removeListener('finish', handle);
  };
}