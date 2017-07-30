"use strict";

const replace = require('../utils/replacement');
const child_process = require('child_process');

exports.exec = (input, output, process, args) => {
    const rargs = replace.replaceArray(args, { "input": input, "output": output });

    console.log(rargs.join(' '));

    return child_process.spawn(process, rargs, { stdio: ['ignore', 1, 2] });
}

