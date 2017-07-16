"use strict";

const replace = require('../utils/replacement');
const child_process = require('child_process');

class Command {

    constructor(input, output, process, args) {
        this.process = process;
        this.args = args;
        this.input = input;
        this.output = output;
    }

    async exec(replacement) {
        const input = replace.replaceString(this.input, replacement);
        const output = replace.replaceString(this.output, replacement);

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

module.exports = Command;
