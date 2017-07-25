P = Class.create(P, {

    init: function () {

        this.view.content.className = 'loading';

        this.program = chinachu.util.getProgramById(this.self.query.id);

        this.onNotify = this.refresh.bindAsEventListener(this);
        document.observe('chinachu:recording', this.onNotify);
        document.observe('chinachu:recorded', this.onNotify);

        if (this.program === null) {
            this.modal = new flagrate.Modal({
                title: '番組が見つかりません',
                text: '番組が見つかりません',
                buttons: [
                    {
                        label: 'ダッシュボード',
                        color: '@pink',
                        onSelect: function (e, modal) {
                            location.hash = '!/dashboard/top/';
                        }
                    }
                ]
            }).show();
            return this;
        }

        this.initToolbar();
        this.draw();

        return this;
    }
    ,
    deinit: function () {

        if (this.modal) setTimeout(function () { this.modal.close(); }.bind(this), 0);

        document.stopObserving('chinachu:recording', this.onNotify);
        document.stopObserving('chinachu:recorded', this.onNotify);

        return this;
    }
    ,
    refresh: function () {

        if (!this.isPlaying) this.app.pm.realizeHash(true);

        return this;
    }
    ,
    initToolbar: function _initToolbar() {

        var program = this.program;

        this.view.toolbar.add({
            key: 'streaming',
            ui: new sakura.ui.Button({
                label: '番組詳細',
                icon: './icons/film.png',
                onClick: function () {
                    location.hash = '!/program/view/id=' + program.id + '/';
                }
            })
        });

        return this;
    }
    ,
    draw: function () {

        var program = this.program;

        this.view.content.className = 'bg-black';
        this.view.content.update();

        var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
        if (typeof program.episode !== 'undefined' && program.episode !== null) {
            titleHtml += '<span class="episode">#' + program.episode + '</span>';
        }
        titleHtml += '<span class="id">#' + program.id + '</span>';

        if (program.isManualReserved) {
            titleHtml = '<span class="flag manual">手動</span>' + titleHtml;
        }

        setTimeout(function () {
            this.view.title.update(titleHtml);
        }.bind(this), 0);

        var saveSettings = function (d) {
            localStorage.setItem('program.watch.settings', JSON.stringify(d));
        };

        var set = JSON.parse(localStorage.getItem('program.watch.settings') || '{}');
        var rtype = program.recorded.match(/\.([^\.]+?$)/)[1];

        set.encoded = 'org';

        if (!set.size) {
            set.size = '';
        }
        if (!set.quality) {
            set.quality = 'high';
        }

        var buttons = [];

        if (Prototype.Browser.MobileSafari) {
            buttons.push({
                label: '再生',
                color: '@pink',
                onSelect: function (e, modal) {

                    this.form.validate(function (success) {
                        if (!success) { return; }

                        var d = this.d = this.form.getResult();
                        saveSettings(d);

                        if (d.encoded === 'new') {
                            new flagrate.Modal({
                                title: 'エラー',
                                text: 'エンコードしながら再生はサポートしていません。'
                            }).show();
                            return;
                        }

                        var url = location.host + location.pathname.replace(/\/[^\/]*$/, '');

                        if (program._isRecording) {
                            url += '/api/recording/';
                        } else {
                            url += '/api/recorded/';
                        }

                        var ext = rtype;
                        if (d.encoded) ext = 'mp4';

                        url += program.id + '/watch.' + ext + '?' + Object.toQueryString(d);

                        if (/Android/.test(navigator.userAgent) === true) {
                            location.href = "intent://" + url + "#Intent;package=org.videolan.vlc;type=video;scheme=" + location.protocol.replace(':', '') + ';end';
                        } else {
                            location.href = "vlc-x-callback://x-callback-url/stream?url=" + encodeURIComponent(location.protocol + '//' + url);
                        }
                    }.bind(this));
                }.bind(this)
            });
        } else {
            buttons.push({
                label: '再生',
                color: '@pink',
                onSelect: function (e, modal) {

                    this.form.validate(function (success) {
                        if (!success) { return; }

                        var d = this.d = this.form.getResult();
                        saveSettings(d);

                        if (d.encoded === 'new') {
                            new flagrate.Modal({
                                title: 'エラー',
                                text: 'エンコードしながら再生はサポートしていません。'
                            }).show();
                            return;
                        }

                        if (rtype === 'm2ts') {
                            var url = location.host + location.pathname.replace(/\/[^\/]*$/, '');

                            if (program._isRecording) {
                                url += '/api/recording/';
                            } else {
                                url += '/api/recorded/';
                            }

                            var ext = rtype;
                            if (d.encoded) ext = 'mp4';

                            url += program.id + '/watch.' + ext + '?' + Object.toQueryString(d);

                            location.href = "vlc:// " + location.protocol + '//' + url;
                        } else {
                            modal.close();
                            this.play();
                        }
                    }.bind(this));
                }.bind(this)
            });

            buttons.push({
                label: 'XSPF',
                color: '@orange',
                onSelect: function (e, modal) {

                    this.form.validate(function (success) {
                        if (!success) { return; }

                        var d = this.form.getResult();
                        saveSettings(d);

                        if (d.encoded === 'new') {
                            new flagrate.Modal({
                                title: 'エラー',
                                text: 'エンコードしながら再生はサポートしていません。'
                            }).show();
                            return;
                        }

                        var url = d.prefix = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');

                        if (program._isRecording) {
                            d.prefix += '/api/recording/' + program.id + '/';
                            url += '/api/recording/';
                        } else {
                            d.prefix += '/api/recorded/' + program.id + '/';
                            url += '/api/recorded/';
                        }

                        url += program.id + '/watch.xspf?' + Object.toQueryString(d);
                        location.href = url;
                    }.bind(this));
                }.bind(this)
            });
        }

        if (!Prototype.Browser.MobileSafari && !program._isRecording) {
            buttons.push({
                label: 'ダウンロード',
                color: '@blue',
                onSelect: function (e, model) {

                    this.form.validate(function (success) {
                        if (!success) { return; }

                        var d = this.form.getResult();
                        saveSettings(d);

                        var ext = rtype;
                        if (d.encoded) ext = 'mp4';

                        if (d.encoded === 'new') {
                            new flagrate.Modal({
                                title: 'エラー',
                                text: 'エンコードしながらダウンロードはサポートしていません。'
                            }).show();
                            return;
                        }

                        d.prefix = location.protocol + '//' + location.host + '/api/recording/' + program.id + '/';
                        d.mode = 'download';
                        location.href = './api/recorded/' + program.id + '/watch.' + ext + '?' + Object.toQueryString(d);
                    }.bind(this));
                }.bind(this)
            });

            buttons.push({
                label: 'エンコード',
                color: '@black',
                onSelect: function (e, modal) {

                    this.form.validate(function (success) {
                        console.log(success);
                        if (!success) { return; }

                        var d = this.d = this.form.getResult();

                        saveSettings(d);

                        if (d.encoded != 'new') {
                            new flagrate.Modal({
                                title: 'エラー',
                                text: '新規エンコードを選択してください'
                            }).show();
                            return;
                        }

                        new Ajax.Request('./api/recorded/' + program.id + '/encode.mp4', {
                            method: 'put',
                            parameters: d,
                            onComplete: function () {
                                modal.close();
                            },
                            onSuccess: function () {
                                new flagrate.Modal({
                                    title: '成功',
                                    text: 'エンコードのキューイングに成功しました'
                                }).show();
                            },
                            onFailure: function (t) {
                                new flagrate.Modal({
                                    title: '失敗',
                                    text: 'エンコードのキューイングに失敗しました (' + t.status + ')'
                                }).show();
                            }
                        });
                    }.bind(this));
                }.bind(this)
            });
        }

        var modal = this.modal = new flagrate.Modal({
            disableCloseByMask: true,
            disableCloseButton: true,
            target: this.view.content,
            title: 'ストリーミング再生',
            buttons: buttons
        }).show();

        var encoded = [];
        encoded.push({
            label: 'オリジナル',
            value: 'org'
        });

        if (program.encoded) {
            program.encoded.forEach((element, index) => {
                encoded.push({
                    label: 'エンコード:' + index,
                    value: index
                });
            });
        }

        encoded.push({
            label: '新規エンコード',
            value: 'new'
        });


        var fields = [
            {
                key: "encoded",
                label: "ファイル",
                input: {
                    type: "radios",
                    isRequired: true,
                    val: set.encoded,
                    items: encoded
                }
            },
            {
                key: 'size',
                label: 'サイズ',
                input: {
                    type: 'select',
                    isRequired: true,
                    val: set.size,
                    items: [
                        {
                            label: '576 (WSVGA)',
                            value: '576'
                        },
                        {
                            label: '720 (HD)',
                            value: '720'
                        },
                        {
                            label: '1080 (FHD)',
                            value: '1080'
                        },
                        {
                            label: '無変換',
                            value: ''
                        }
                    ]
                },
                depends: [
                    { key: 'encoded', val: 'new' }
                ]
            },
            {
                key: 'quality',
                label: '品質',
                input: {
                    type: 'radios',
                    isRequired: true,
                    val: set.quality,
                    items: [
                        {
                            label: 'high',
                            value: 'high'
                        },
                        {
                            label: 'medium',
                            value: 'medium'
                        },
                        {
                            label: 'low',
                            value: 'low'
                        }
                    ]
                },
                depends: [
                    { key: 'encoded', val: 'new' }
                ]
            }
        ];

        if (program.encoded) {
            program.encoded.forEach((element, index) => {
                fields.push({
                    key: 'size',
                    label: 'サイズ',
                    input: {
                        type: 'radios',
                        isRequired: true,
                        val: set.size,
                        items: [
                            {
                                label: element.config.size,
                                value: element.config.size
                            }
                        ]
                    },
                    depends: [
                        { key: 'encoded', val: index }
                    ]
                });

                fields.push({
                    key: 'quality',
                    label: '品質',
                    input: {
                        type: 'radios',
                        isRequired: true,
                        val: set.quality,
                        items: [
                            {
                                label: element.config.quality,
                                value: element.config.quality
                            }
                        ]
                    },
                    depends: [
                        { key: 'encoded', val: index }
                    ]
                });

            });
        }

        this.form = flagrate.createForm({ fields: fields });

        this.form.insertTo(modal.content);

        return this;
    }
    ,
    play: function () {

        this.isPlaying = true;

        var p = this.program;
        var d = this.d;

        d.ss = d.ss || 0;

        if (p._isRecording) d.ss = '';

        var getRequestURI = function () {

            var r = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');
            r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/watch.' + d.ext;
            var q = Object.toQueryString(d);

            return r + '?' + q;
        };

        var getPreviewURI = function (pos) {

            var r = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');
            r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/preview.jpg';
            var q = 'width=480&height=270&pos=' + pos;

            return r + '?' + q;
        };

        var togglePlay = function () {

            if (p._isRecording) return;

            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        };

        // create video view

        var videoContainer = new flagrate.Element('div', {
            'class': 'video-container'
        }).insertTo(this.view.content);

        var video = new flagrate.Element('video', {
            autoplay: false,
            controls: false,
            poster: getPreviewURI(0)
        }).insertTo(videoContainer);

        new flagrate.Element('source', {
            src: getRequestURI(),
            type: 'video/' + d.ext
        }).insertTo(video);

        //debug
        window.video = video;

        video.onloadstart = function () {
            control.getElementByKey('play').setLabelHTML('&#8987;');
        };

        video.oncanplay = function () {
            if (video.paused) {
                control.getElementByKey('play').setLabelHTML('&#57458;');
            } else {
                control.getElementByKey('play').setLabelHTML('&#57459;');
            }
        };

        video.onpause = function () {
            control.getElementByKey('play').setLabelHTML('&#57458;');
            d.ss = seek.getValue() - 2;
            console.log(d.ss);
            video.src = getRequestURI();
        };

        video.onplay = function () {
            video.poster = "";
            control.getElementByKey('play').setLabelHTML('&#57459;');
        };

        video.volume = 1;

        video.play();

        // create control view

        var control = new flagrate.Toolbar({
            className: 'video-control',
            items: [
                {
                    key: 'play',
                    element: new flagrate.Button({ labelHTML: '&#8987;', onSelect: togglePlay })
                },
                '--',
                {
                    key: 'fast-rewind',
                    element: new flagrate.Button({ labelHTML: '&#57457;' })
                },
                {
                    key: 'fast-forward',
                    element: new flagrate.Button({ labelHTML: '&#57461;' })
                },
                '--',
                {
                    key: 'played',
                    element: new flagrate.Element('span').insertText('00:00')
                },
                {
                    key: 'seek',
                    element: new flagrate.Slider({ value: 0, max: p.seconds, className: 'seek' })
                },
                {
                    key: 'duration',
                    element: new flagrate.Element('span').insertText(
                        Math.floor(p.seconds / 60).toPaddedString(2) + ':' + (p.seconds % 60).toPaddedString(2)
                    )
                },
                '--',
                {
                    key: 'vol',
                    element: new flagrate.Slider({ value: 10, max: 10 })
                }
            ]
        }).insertTo(this.view.content);

        var seek = control.getElementByKey('seek');

        var seekTimeoutId = null;
        var seekSlideEvent = function () {
            if (seekTimeoutId) {
                return false;
            }
            var lastValue = seek.getValue();

            seek.disable();
            fastForward.disable();
            fastRewind.disable();

            seekTimeoutId = setTimeout(function () {
                var value = seek.getValue();
                seekTimeoutId = null;
                if (lastValue === value) {
                    d.ss = value;
                    var uri = getRequestURI();

                    video.src = uri;
                    video.play();

                    lastTime = 0;
                    currentTime = d.ss * 1000;

                    setTimeout(function () {
                        seek.enable();
                        fastForward.enable();
                        fastRewind.enable();
                    }, 1000);
                } else {
                    seekSlideEvent();
                }
            }, 500);
        };

        var seekValue = function (value) {
            var sec = seek.getValue() + value;
            if (sec < 0) sec = 0;
            else if (sec > p.seconds) sec = p.seconds;
            seek.setValue(sec);
            seekSlideEvent();
        };

        var fastForward = control.getElementByKey('fast-forward');
        fastForward.addEventListener('click', function () {
            seekValue(15);
        });

        var fastRewind = control.getElementByKey('fast-rewind')
        fastRewind.addEventListener('click', function () {
            seekValue(-15);
        });


        if (p._isRecording) {
            seek.disable();
            control.getElementByKey('play').updateText('Live');
            control.getElementByKey('play').disable();
        }

        control.getElementByKey('vol').addEventListener('slide', function () {

            var vol = control.getElementByKey('vol');

            video.volume = vol.getValue() / 10;
        });

        seek.addEventListener('slide', seekSlideEvent);

        var lastTime = 0;
        var currentTime = 0;

        var updateTime = function () {

            if (seek.isEnabled() === false) return;

            if (lastTime && video.paused === false) {
                currentTime += Date.now() - lastTime;
            }

            var current = Math.floor(currentTime / 1000);

            control.getElementByKey('played').updateText(
                Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
            );
            seek.setValue(current);

            lastTime = Date.now();
        };

        var updateLiveTime = function () {

            var current = (new Date().getTime() - p.start) / 1000;

            current = Math.floor(current);

            if (current > p.seconds) {
                this.app.pm.realizeHash(true);
            }

            control.getElementByKey('played').updateText(
                Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
            );
            seek.setValue(current);
        }.bind(this);

        if (p._isRecording) {
            this.timer.updateLiveTime = setInterval(updateLiveTime, 250);
        } else {
            this.timer.updateTime = setInterval(updateTime, 100);
        }

        return this;
    }
});
