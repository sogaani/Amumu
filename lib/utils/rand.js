exports.getRandString = function () {
    var c = "abcdefghijklmnopqrstuvwxyz0123456789";

    var cl = c.length;
    var r = "";
    for (var i = 0; i < 8; i++) {
        r += c[Math.floor(Math.random() * cl)];
    }

    return r;
}