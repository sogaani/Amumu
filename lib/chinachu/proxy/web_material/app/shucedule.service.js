"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var Observable_1 = require("rxjs/Observable");
var Subject_1 = require("rxjs/Subject");
require("rxjs/add/operator/map");
require("rxjs/add/operator/catch");
var channel_1 = require("./channel");
var socketio_service_1 = require("./socketio.service");
var ShuceduleService = (function () {
    function ShuceduleService(http, socketIOService) {
        var _this = this;
        this.http = http;
        this.socketIOService = socketIOService;
        this.scheduleUrl = 'api/schedule.json';
        this.programUrl = 'api/schedule/:chid.json';
        this.subject = new Subject_1.Subject();
        this.socketIOService.connect();
        this.connection = this.socketIOService.on('notify-schedule').subscribe(function () {
            _this.http.get(_this.scheduleUrl)
                .map(_this.extractData)
                .subscribe(function (data) {
                var channels = [];
                data.forEach(function (channel) {
                    _this.http.get(_this.programUrl.replace(/:chid/, channel.id))
                        .map(_this.extractData)
                        .subscribe(function (data) {
                        channels.push(new channel_1.Channel(channel.id, data.programs));
                    });
                });
                _this.channels = channels;
                _this.subject.next({ name: 'update' });
            });
        });
    }
    ShuceduleService.prototype.getEvent = function () {
        return this.subject.asObservable();
    };
    ShuceduleService.prototype.getShucedule = function () {
        return this.channels;
    };
    // レスポンスデータの整形処理
    ShuceduleService.prototype.extractData = function (res) {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);
        }
        var body = res.json();
        return body;
    };
    // エラー処理
    ShuceduleService.prototype.handleError = function (error) {
        // In a real world app, we might send the error to remote logging infrastructure
        var errMsg = error.message || 'Server error';
        console.error(errMsg); // log to console instead
        return Observable_1.Observable.throw(errMsg);
    };
    return ShuceduleService;
}());
ShuceduleService.decorators = [
    { type: core_1.Injectable },
];
/** @nocollapse */
ShuceduleService.ctorParameters = function () { return [
    { type: http_1.Http, },
    { type: socketio_service_1.SocketIOService, },
]; };
exports.ShuceduleService = ShuceduleService;
//# sourceMappingURL=shucedule.service.js.map