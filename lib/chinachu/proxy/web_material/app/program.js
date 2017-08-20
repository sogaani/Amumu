"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Days = ['日', '月', '火', '水', '木', '金', '土'];
var Program = (function () {
    function Program(obj) {
        this.selected = false;
        this.type = obj.type;
        this.channel = obj.channel;
        this.category = obj.category;
        this.title = obj.title;
        this.start = obj.start;
        this.end = obj.end;
        this.duration = obj.duration;
        var date = new Date(this.start);
        this.startString = (date.getMonth() + 1) + "/" + date.getDate() + "(" + Days[date.getDay()] + ") " + date.getHours() + ":" + date.getMinutes();
    }
    return Program;
}());
exports.Program = Program;
//# sourceMappingURL=program.js.map