function createRegexps(replacement) {
    var regexps = {};
    Object.keys(replacement).map(key => {
        regexps[key] = new RegExp(`<${key}>`, 'g');
    });
    return regexps;
}

exports.replaceString = function (string, replacement) {
    let regexps = createRegexps(replacement);
    var ret = string;
    Object.keys(replacement).map(key => {
        ret = ret.replace(regexps[key], replacement[key]);

    });
    return ret;
}

exports.replaceArray = function (array, replacement) {
    var ret = [];
    let regexps = createRegexps(replacement);

    array.forEach((element, index, array) => {
        let tmp = element;
        Object.keys(replacement).map(key => {
            tmp = tmp.replace(regexps[key], replacement[key]);
        });
        ret.push(tmp);
    });
    return ret;
}