"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var shucedule_service_1 = require("./shucedule.service");
var ShuceduleComponent = (function () {
    function ShuceduleComponent(shuceduleService) {
        var _this = this;
        this.shuceduleService = shuceduleService;
        this.shuceduleService.getEvent().subscribe(function () {
            _this.channels = _this.shuceduleService.getShucedule();
        });
    }
    ShuceduleComponent.prototype.ngOnInit = function () {
        this.time = new Date().getTime();
        this.date = new Date().setHours(0, 0, 0, 0);
    };
    return ShuceduleComponent;
}());
ShuceduleComponent.decorators = [
    { type: core_1.Component, args: [{
                selector: 'amumu-shucedule',
                templateUrl: './shucedule.component.html',
                styleUrls: ['./shucedule.component.css']
            },] },
];
/** @nocollapse */
ShuceduleComponent.ctorParameters = function () { return [
    { type: shucedule_service_1.ShuceduleService, },
]; };
exports.ShuceduleComponent = ShuceduleComponent;
//# sourceMappingURL=shucedule.component.js.map