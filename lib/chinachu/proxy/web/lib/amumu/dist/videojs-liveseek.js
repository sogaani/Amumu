(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsLiveseek = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
const videojs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);
const io = (typeof window !== "undefined" ? window['io'] : typeof global !== "undefined" ? global['io'] : null);

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});