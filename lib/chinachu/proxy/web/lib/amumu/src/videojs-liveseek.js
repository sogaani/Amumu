const videojs = require('video.js');
const io = require('socket.io');

// Default options for the plugin.
const defaults = {
};

const sockets = {};

const SeekBar = videojs.getComponent('SeekBar');

SeekBar.prototype.handleMouseMove = function (event) {
    let newTime = this.calculateDistance(event) * this.player_.duration();
    const encTime = this.player_.encodedTime
    // Don't let video end while scrubbing.
    if (newTime >= encTime - 5) {
        newTime = encTime - 5;
    }

    // Set new time (tell player to seek to new time)
    this.player_.currentTime(newTime);
};

const onPlayerReady = (player, options) => {
    const url = new URL(player.currentSrc());

    player._socket = io.connect(url.protocol + '//' + url.host);

    player._socket.on('create', (time) => {
        player.encodedTime = time;
    });

    const match = url.pathname.match(/^\/api\/hls\/([^\/]+)/);

    player._socket.once('connect', () => {
        match && player._socket.emit('connected', match[1])
    });
};

const liveseek = function (options) {
    if (!options) {
        options = defaults;
    }

    this.on('dispose', (event) => {
        console.log('socket dispose');
        this._socket && this._socket.close();
    });

    this.ready(() => {
        onPlayerReady(this, videojs.mergeOptions(defaults, options));
    });
};

videojs.plugin('liveseek', liveseek);
