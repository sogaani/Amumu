const request = require('request-promise-native');

class Chinachu {
    constructor(path) {
        this.path = path;
        this._request = request.defaults({ simple: false, followRedirect: true, resolveWithFullResponse: true, });
    }

    async deleteFile(id, recorded) {
        var res = await _request.del(this.path + 'api/recorded/' + id + '/file.json');

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed del request statuscode:' + res.statusCode));
        }
    }

    async replaceInfo(id, recorded) {
        var res = await _request.put({
            uri: this.path + 'api/recorded/' + id + '.json',
            form: {
                json: JSON.stringify({ recorded: recorded.match(/^(.+)\.[^\.]+?$/)[1] + '.mp4' })
            }
        });

        if (res.statusCode !== 200) {
            return Promise.reject(new Error('Failed put request statuscode:' + res.statusCode));
        }
    }
}
