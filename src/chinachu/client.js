const request = require('request-promise-native');

class ChinachuClient {
    constructor(path) {
        this.path = path;
        this._request = request.defaults({ simple: false, followRedirect: true, resolveWithFullResponse: true, });
    }

    async deleteFile(id) {
        const uri = this.path + '/api/recorded/' + id + '/file.json';
        const res = await this._request.del(uri);

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed del request from ' + uri + ' statuscode:' + res.statusCode));
        }
    }

    async getProgramById(id) {
        const uri = this.path + '/api/recorded/' + id + '.json';
        const res = await this._request.get(uri);

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed get request from ' + uri + ' statuscode:' + res.statusCode));
        }

        try {
            const program = JSON.parse(res.body);
            return program;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async replaceInfo(id, recorded) {
        const uri = this.path + '/api/recorded/' + id + '.json';
        const res = await this._request.put({
            uri: uri,
            form: {
                json: JSON.stringify({ recorded: recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4' })
            }
        });

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed put request from ' + uri + ' statuscode:' + res.statusCode));
        }
    }
}


module.exports = ChinachuClient;