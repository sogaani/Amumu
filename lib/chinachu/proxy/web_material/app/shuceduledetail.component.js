"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var carousel_component_1 = require("./carousel.component");
var ShuceduleDetailComponent = (function () {
    function ShuceduleDetailComponent(carousel) {
        this.carousel = carousel;
    }
    ShuceduleDetailComponent.prototype.ngOnInit = function () {
        this.carousel.addSlide(this);
    };
    ShuceduleDetailComponent.prototype.ngOnDestroy = function () {
        this.carousel.removeSlide(this);
    };
    ShuceduleDetailComponent.prototype.getStyle = function (program) {
        var top = Math.floor((program.start - this.date) / (20 * 1000));
        var height = Math.floor((program.end - program.start) / (20 * 1000));
        return { "height": height + 'px', "top": top + 'px' };
    };
    return ShuceduleDetailComponent;
}());
ShuceduleDetailComponent.decorators = [
    { type: core_1.Component, args: [{
                selector: 'shucedule-detail',
                templateUrl: './shuceduledetail.component.html',
                styleUrls: ['./shuceduledetail.component.css']
            },] },
];
/** @nocollapse */
ShuceduleDetailComponent.ctorParameters = function () { return [
    { type: carousel_component_1.Carousel, },
]; };
ShuceduleDetailComponent.propDecorators = {
    'channel': [{ type: core_1.Input },],
    'time': [{ type: core_1.Input },],
    'date': [{ type: core_1.Input },],
    'index': [{ type: core_1.Input },],
    'direction': [{ type: core_1.Input },],
    'active': [{ type: core_1.HostBinding, args: ['class.active',] }, { type: core_1.Input },],
};
exports.ShuceduleDetailComponent = ShuceduleDetailComponent;
//# sourceMappingURL=shuceduledetail.component.js.map