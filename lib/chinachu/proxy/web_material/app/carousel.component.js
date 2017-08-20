"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var Direction;
(function (Direction) {
    Direction[Direction["UNKNOWN"] = 0] = "UNKNOWN";
    Direction[Direction["NEXT"] = 1] = "NEXT";
    Direction[Direction["PREV"] = 2] = "PREV";
})(Direction = exports.Direction || (exports.Direction = {}));
var Carousel = (function () {
    function Carousel() {
        this.slides = [];
        this.destroyed = false;
    }
    Object.defineProperty(Carousel.prototype, "interval", {
        get: function () {
            return this._interval;
        },
        set: function (value) {
            this._interval = value;
            this.restartTimer();
        },
        enumerable: true,
        configurable: true
    });
    Carousel.prototype.ngOnDestroy = function () {
        this.destroyed = true;
    };
    Carousel.prototype.select = function (nextSlide, direction) {
        if (direction === void 0) { direction = Direction.UNKNOWN; }
        var nextIndex = nextSlide.index;
        if (direction === Direction.UNKNOWN) {
            direction = nextIndex > this.getCurrentIndex() ? Direction.NEXT : Direction.PREV;
        }
        // Prevent this user-triggered transition from occurring if there is already one in progress
        if (nextSlide && nextSlide !== this.currentSlide) {
            this.goNext(nextSlide, direction);
        }
    };
    Carousel.prototype.goNext = function (slide, direction) {
        if (this.destroyed) {
            return;
        }
        slide.direction = direction;
        slide.active = true;
        if (this.currentSlide) {
            this.currentSlide.direction = direction;
            this.currentSlide.active = false;
        }
        this.currentSlide = slide;
        // every time you change slides, reset the timer
        this.restartTimer();
    };
    Carousel.prototype.getSlideByIndex = function (index) {
        var len = this.slides.length;
        for (var i = 0; i < len; ++i) {
            if (this.slides[i].index === index) {
                return this.slides[i];
            }
        }
    };
    Carousel.prototype.getCurrentIndex = function () {
        return !this.currentSlide ? 0 : this.currentSlide.index;
    };
    Carousel.prototype.next = function () {
        var newIndex = (this.getCurrentIndex() + 1) % this.slides.length;
        if (newIndex === 0 && this.noWrap) {
            this.pause();
            return;
        }
        return this.select(this.getSlideByIndex(newIndex), Direction.NEXT);
    };
    Carousel.prototype.prev = function () {
        var newIndex = this.getCurrentIndex() - 1 < 0 ? this.slides.length - 1 : this.getCurrentIndex() - 1;
        if (this.noWrap && newIndex === this.slides.length - 1) {
            this.pause();
            return;
        }
        return this.select(this.getSlideByIndex(newIndex), Direction.PREV);
    };
    Carousel.prototype.restartTimer = function () {
        var _this = this;
        this.resetTimer();
        var interval = +this.interval;
        if (!isNaN(interval) && interval > 0) {
            this.currentInterval = setInterval(function () {
                var nInterval = +_this.interval;
                if (_this.isPlaying && !isNaN(_this.interval) && nInterval > 0 && _this.slides.length) {
                    _this.next();
                }
                else {
                    _this.pause();
                }
            }, interval);
        }
    };
    Carousel.prototype.resetTimer = function () {
        if (this.currentInterval) {
            clearInterval(this.currentInterval);
            this.currentInterval = null;
        }
    };
    Carousel.prototype.play = function () {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.restartTimer();
        }
    };
    Carousel.prototype.pause = function () {
        if (!this.noPause) {
            this.isPlaying = false;
            this.resetTimer();
        }
    };
    Carousel.prototype.addSlide = function (slide) {
        slide.index = this.slides.length;
        this.slides.push(slide);
        if (this.slides.length === 1 || slide.active) {
            this.select(this.slides[this.slides.length - 1]);
            if (this.slides.length === 1) {
                this.play();
            }
        }
        else {
            slide.active = false;
        }
    };
    Carousel.prototype.removeSlide = function (slide) {
        this.slides.splice(slide.index, 1);
        if (this.slides.length === 0) {
            this.currentSlide = null;
            return;
        }
        for (var i = 0; i < this.slides.length; i++) {
            this.slides[i].index = i;
        }
    };
    return Carousel;
}());
Carousel.decorators = [
    { type: core_1.Component, args: [{
                selector: 'carousel',
                template: "\n    <div (mouseenter)=\"pause()\" (mouseleave)=\"play()\" class=\"carousel slide\">\n      <ol class=\"carousel-indicators\" [hidden]=\"slides.length <= 1\">\n         <div *ngFor=\"let slide of slides\" [class.active]=\"slide.active === true\" (click)=\"select(slide)\"></div>\n      </ol>\n      <div class=\"carousel-inner\"><ng-content></ng-content></div>\n                  <a class=\"left carousel-control\" (click)=\"prev()\" [hidden]=\"!slides.length\">\n                  <span class=\"glyphicon glyphicon-chevron-left\"></span>\n                  </a>\n                  <a class=\"right carousel-control\" (click)=\"next()\" [hidden]=\"!slides.length\">\n                  <span class=\"glyphicon glyphicon-chevron-right\"></span>\n                 </a>\n    </div>\n  "
            },] },
];
/** @nocollapse */
Carousel.ctorParameters = function () { return []; };
Carousel.propDecorators = {
    'noWrap': [{ type: core_1.Input },],
    'noPause': [{ type: core_1.Input },],
    'noTransition': [{ type: core_1.Input },],
    'interval': [{ type: core_1.Input },],
};
exports.Carousel = Carousel;
//# sourceMappingURL=carousel.component.js.map