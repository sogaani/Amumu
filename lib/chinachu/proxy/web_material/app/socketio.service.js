"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var io = require("socket.io-client");
var Observable_1 = require("rxjs/Observable");
var SocketIOService = (function () {
    function SocketIOService() {
        this.socket = null;
    }
    SocketIOService.prototype.connect = function () {
        this.socket = io(window.location.protocol + '//' + window.location.host, { path: window.location.pathname.replace(/[^\/]*$/g, '') + 'socket.io' });
        console.log(window.location.protocol + '//' + window.location.host, window.location.pathname.replace(/[^\/]*$/g, '') + 'socket.io');
    };
    SocketIOService.prototype.emit = function (emitName, data) {
        this.socket.emit(emitName, data);
    };
    SocketIOService.prototype.on = function (onName) {
        var _this = this;
        var observable = new Observable_1.Observable(function (observer) {
            _this.socket.on(onName, function (data) {
                observer.next(data);
            });
        });
        return observable;
    };
    return SocketIOService;
}());
SocketIOService.decorators = [
    { type: core_1.Injectable },
];
/** @nocollapse */
SocketIOService.ctorParameters = function () { return []; };
exports.SocketIOService = SocketIOService;
//# sourceMappingURL=socketio.service.js.map