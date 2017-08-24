const request = require('request-promise-native');
const access = require('../utils/access');

const PORT = 30782;

class EncoderClient {
    constructor(encoders) {
        this.encoders = encoders;
        this._request = request.defaults({ simple: false, followRedirect: true, followAllRedirects: true, followOriginalHttpMethod: true, resolveWithFullResponse: true });
    }

    async getEncoderIp() {
        const length = this.encoders.length;
        let ip = null;
        for (let i = 0; i < length; i++) {
            const host = this.encoders[i];
            if (await access.checkPort(host, PORT)) {
                ip = host;
                break;
            }
        }
        return ip;
    }

    async encode(id, config) {
        const ip = await this.getEncoderIp();

        if (!ip) {
            return Promise.reject(new Error('No encoder available'));
        }

        const uri = 'http://' + ip + ':30782/api/recorded/' + id + '/encode.json';
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