"use strict";

const replace = require('../utils/replacement');
const child_process = require('child_process');
const fs = require('fs');

exports.exec = (input, output, process, args, chinachu) => {

    const rargs = replace.replaceArray(args, { "input": input, "output": output });

    console.log(rargs.join(' '));

    const proc = child_process.spawn(process, rargs, { stdio: ['ignore', 1, 2] });

    return proc;
}

