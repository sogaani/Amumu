"use strict";

const replace = require('../utils/replacement');
const child_process = require('child_process');
const fs = require('fs');

exports.exec = (input, output, process, args) => {
    const toutput = output.replace(/([^\/]+)(\..+$)/, '$1_tmp$2');
    const rargs = replace.replaceArray(args, { "input": input, "output": toutput });

    console.log(rargs.join(' '));

    const proc = child_process.spawn(process, rargs, { stdio: ['ignore', 1, 2] });

    proc.once('exit', (code) => {
        let err = null;
        if (code == 0) {
            // 成功
            fs.rename(toutput, output, () => {});
        } else {
            // 失敗
            fs.unlink(toutput, () => {});
        }
    });

    return proc;
}

