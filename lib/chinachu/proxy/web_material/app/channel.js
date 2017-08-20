"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var program_1 = require("./program");
var Channel = (function () {
    function Channel(id, obj) {
        this.programs = [];
        this.id = id;
        var length = obj.length;
        for (var i = 0; i < length; i++) {
            this.programs.push(new program_1.Program(obj[i]));
        }
    }
    Channel.prototype.getPrograms = function (startTime, endTime) {
        var programs = [];
        this.programs.forEach(function (program) {
            if (program.start >= startTime && program.start < endTime) {
                programs.push(program);
            }
        });
        console.log(programs);
        return programs;
    };
    return Channel;
}());
exports.Channel = Channel;
//# sourceMappingURL=channel.js.map