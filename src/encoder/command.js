"use strict";

const replace = require('../utils/replacement');
const child_process = require('child_process');

exports.exec = (input, output, process, args, pipe) => {
    const rargs = replace.replaceArray(args, { "input": input, "output": output });

    console.log(rargs.join(' '));

    return child_process.spawn(process, rargs, { stdio: ['ignore', pipe === true ? 'pipe' : 1, 2] });
}

// deprecated
class Command {

    constructor(input, output, process, args, format) {
        this.process = process;
        this.args = args;
        this.input = input;
        this.output = output;
        this.format = format;
    }

    async exec(file) {
        const input = this.input + file;
        const output = this.output + file.replace(/\.[^.]+$/, `.${this.format}`);

        const args = replace.replaceArray(this.args, { "input": input, "output": output });

        console.log(args.join(' '));
        var proc = child_process.spawn(this.process, args, { stdio: ['ignore', 1, 2] });
        await new Promise((resolve, reject) => {
            proc.on('exit', (code) => {
                if (code != 0) {
                    reject(new Error('Failed encode process code:' + code));
                } else {
                    resolve();
                }
            });
        });
    }
}

//module.exports = Command;
