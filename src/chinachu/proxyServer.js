"use strict";

const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const vm = require('vm');

exports.createProxyServer = (chinachuPath) => {
  return new ChinachuProxy(chinachuPath);
}

class ChinachuProxy {
  constructor(chinachuPath) {
    const self = this;
    self.passthroughProxy = httpProxy.createProxyServer({});

    self.passthroughProxy.on('proxyReq', function (proxyReq, req, res, options) {
      proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
    });

    self.proxies = [];

    fs.readdir('./proxy/', (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        let pattern = new RegExp('^/' + file.replace(/-/g, '/').replace(/:[^\/]+/g, '([^/]+)'));
        let k = file.match(new RegExp(file.replace(/:[^\/]+/g, '([^/]+)')));
        let param = [];
        for (i = 0; i < k.length; i++) {
          param.push(k[i].replace(':', ''));
        }

        let proxy = {
          pattern: pattern,
          file: './proxy/' + file,
          param: param
        }
        self.proxies.push(proxy);
      });
    });

    self.server = http.createServer(self._httpServer);
  }

  listen(port) {
    this.server.listen(port);
  }

  async _httpServer(req, res) {
    const self = this;
    let isProxied = false;

    self.proxies.forEach(async (proxy) => {
      if (req.url.match(proxy.pattern) !== null) {
        isProxied = true;

        // ヘッダの確認
        if (!req.headers.host) { return self._resErr(400); }

        // ファイルの確認
        if (fs.existsSync(proxy.file) === false) { return self._resErr(501); }

        // HTTPメソッド指定を上書き
        if (query.method) {
          req.method = query.method.toUpperCase();
          delete query.method;
        }

        let query = await self._parseQuery(req);

        self._proxyCall(req, res, query, file);
      }
    });

    if (!isProxied) {
      self.passthroughProxy.web(req, res, {
        target: chinachuPath
      });
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


  _proxyCall(req, res, query, proxy) {



    let param = {}
    for (i = 1; i < proxy.param.length; i++) {
      param[proxy.param[i]] = req.url.match(proxy.pattern)[i];
    }

    let location = req.url;
    if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
    if (location.match(/\/$/) !== null) { location += 'index.html'; }

    let ext = null;
    if (location.match(/[^\/]+\..+$/) !== null) {
      ext = location.split('.').pop();
    }


    if (query._method) {
      req.method = query._method.toUpperCase();
      delete query._method;
    }


    res._end = res.end;
    res.end = function () {
      res.end = res._end;
      res.end.apply(res, arguments);
      res.emit('end');
    };

    let sandbox = {
      request: req,
      response: res,
      path: path,
      fs: fs,
      child_process: child_process,
      config: config,
      children: []
    };

    let isClosed = false;

    sandbox.request.query = query;
    sandbox.request.param = param;
    sandbox.request.type = ext;
    sandbox.response.head = (code) => {
      self._writeHead(res, code, ext);
    };
    sandbox.response.error = (code) => {
      isClosed = true;

      self._resErr(res, code);

      self._cleanup(sandbox,res);
    };

    const onResponseClose = () => {

      if (!isClosed) {
        isClosed = true;
      }

      self._cleanup(sandbox,res);
    };


    res.on('close', onResponseClose);
    res.on('finish', onResponseClose);

    try {
      vm.runInNewContext(fs.readFileSync(proxy.file), sandbox, proxy.file);
    } catch (ee) {
      if (!isClosed) {
        self._resErr(500);
        isClosed = true;
      }

      console.error(ee);
    }
  }

  _resErr(res, code) {

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

  _cleanup(sandbox,res) {

    setTimeout(() => {

      sandbox.children.forEach((proc) => {

        try {
        } catch (e) {
        }
      });

      sandbox = null;
    }, 1000);

    res.removeListener('close', onResponseClose);
    res.removeListener('finish', onResponseClose);
  };
}