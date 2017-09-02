const request = require('request-promise-native');

class ChinachuClient {
    constructor(path) {
        this.path = path;
        this._request = request.defaults({ simple: false, followRedirect: true, followAllRedirects: true, followOriginalHttpMethod: true, resolveWithFullResponse: true });
    }

    getStream(input) {
        return this._request(input);
    }

    async deleteFile(id, encoded) {
        const uri = this.path + '/api/recorded/' + id + '/file.json';
        const res = await this._request.del({
            uri: uri,
            form: { encoded: encoded || '' }
        });

        // 404と410ならすでに削除済み
        if (res.statusCode !== 200 && res.statusCode !== 404 && res.statusCode !== 410) {
            return Promise.reject(new Error('Failed del request from ' + uri + ' statuscode:' + res.statusCode));
        }
    }

    async existFile(id, encoded) {
        const uri = this.path + '/api/recorded/' + id + '/file.json';
        const res = await this._request.get({
            uri: uri,
            qs: { encoded: encoded || '' }
        });

        if (res.statusCode !== 200) {
            return false;
        }
        return true;
    }

    async getRecorded() {
        const uri = this.path + '/api/recorded.json';
        const res = await this._request.get(uri);

        if (res.statusCode !== 200) {
            console.log(new Error('Failed get request from ' + uri + ' statuscode:' + res.statusCode))
            return null;
        }

        try {
            const recorded = JSON.parse(res.body);
            return recorded;
        } catch (e) {
            console.log(e);
            return null;
        }
    }


    async cleanup() {
        const uri = this.path + '/api/recorded.json';
        const res = await this._request.put(uri);

        if (res.statusCode !== 200) {
            console.log('Failed put request from ' + uri + ' statuscode:' + res.statusCode);
            return null;
        }

        try {
            const recorded = JSON.parse(res.body);
            return recorded;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async getRecordingProgramById(id) {
        const uri = this.path + '/api/recording/' + id + '.json';
        const res = await this._request.get(uri);

        if (res.statusCode !== 200) {
            console.log('Failed get request from ' + uri + ' statuscode:' + res.statusCode);
            return null;
        }

        try {
            const program = JSON.parse(res.body);
            program._isRecording = true;
            return program;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async getProgramById(id) {
        const uri = this.path + '/api/recorded/' + id + '.json';
        const res = await this._request.get(uri);

        if (res.statusCode !== 200) {
            console.log('Failed get request from ' + uri + ' statuscode:' + res.statusCode);
            return null;
        }

        try {
            const program = JSON.parse(res.body);
            return program;
        } catch (e) {
            console.log(e);
            return null;
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