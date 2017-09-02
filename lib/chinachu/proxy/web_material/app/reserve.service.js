"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var Observable_1 = require("rxjs/Observable");
var Subject_1 = require("rxjs/Subject");
require("rxjs/add/operator/map");
require("rxjs/add/operator/catch");
var program_1 = require("./program");
var socketio_service_1 = require("./socketio.service");
var ReserveService = (function () {
    function ReserveService(http, socketIOService) {
        var _this = this;
        this.http = http;
        this.socketIOService = socketIOService;
        this.reservesUrl = 'api/reserves.json';
        this.subject = new Subject_1.Subject();
        this.socketIOService.connect();
        this.connection = this.socketIOService.on('notify-reserves').subscribe(function () {
            _this.http.get(_this.reservesUrl)
                .map(_this.extractData)
                .subscribe(function (data) {
                var programs = [];
                var length = data.length;
                for (var i = 0; i < length; i++) {
                    programs.push(new program_1.Program(data[i]));
                }
                _this.programs = programs;
                _this.subject.next({ name: 'update' });
            });
        });
    }
    ReserveService.prototype.getEvent = function () {
        return this.subject.asObservable();
    };
    ReserveService.prototype.getShucedule = function () {
        return this.programs;
    };
    // レスポンスデータの整形処理
    ReserveService.prototype.extractData = function (res) {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);
        }
        var body = res.json();
        return body || [];
    };
    // エラー処理
    ReserveService.prototype.handleError = function (error) {
        // In a real world app, we might send the error to remote logging infrastructure
        var errMsg = error.message || 'Server error';
        console.error(errMsg); // log to console instead
        return Observable_1.Observable.throw(errMsg);
    };
    return ReserveService;
}());
ReserveService.decorators = [
    { type: core_1.Injectable },
];
/** @nocollapse */
ReserveService.ctorParameters = function () { return [
    { type: http_1.Http, },
    { type: socketio_service_1.SocketIOService, },
]; };
exports.ReserveService = ReserveService;
//# sourceMappingURL=reserve.service.js.map