const request = require('request-promise-native');

class EncoderClient {
    constructor(path) {
        this.path = path;
        this._request = request.defaults({ simple: false, followRedirect: true, followAllRedirects: true, followOriginalHttpMethod: true, resolveWithFullResponse: true });
    }

    async encode(id, config) {
        const uri = this.path + '/api/recorded/' + id + '/encode.json';
        const res = await this._request.put({
            uri: uri,
            form: config || ''
        });

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed put request from ' + uri + ' statuscode:' + res.statusCode));
        }

        try {
            return JSON.parse(res.body);
        } catch (e) {
            return Promise.reject(e);
        }
    }

}


module.exports = EncoderClient;