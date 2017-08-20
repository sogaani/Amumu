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

        if (this.player) setTimeout(function () { this.player.dispose(); }.bind(this), 0);
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

        set.encoded = 'org';
        if (!set.original) {
            set.original = false;
        }
        if (!set.size) {
            set.size = '';
        }
        if (!set.quality) {
            set.quality = 'high';
        }

        var buttons = [];

        buttons.push({
            label: '再生',
            color: '@pink',
            onSelect: function (e, modal) {

                this.form.validate(function (success) {
                    if (!success) { return; }

                    var d = this.d = this.form.getResult();
                    saveSettings(d);

                    var onFileSuccess = function (t, e) {
                        modal.close();
                        this.play(t.responseJSON.id);
                    }.bind(this);

                    if (d.encoded === 'new') {
                        d.hls = "true";
                        console.log(d);
                        new Ajax.Request('./api/recorded/' + program.id + '/encode.json', {
                            method: 'put',
                            parameters: d,
                            onSuccess: onFileSuccess,
                            onFailure: function (t) {
                                new flagrate.Modal({
                                    title: '失敗',
                                    text: 'ストリーミングの開始に失敗しました (' + t.status + ')'
                                }).show();
                            }
                        });
                        console.log('comp');
                    } else {
                        modal.close();
                        this.play();
                    }
                }.bind(this));
            }.bind(this)
        });

        if (!program._isRecording) {
            buttons.push({
                label: 'ダウンロード',
                color: '@blue',
                onSelect: function (e, model) {

                    this.form.validate(function (success) {
                        if (!success) { return; }

                        var d = this.form.getResult();
                        saveSettings(d);

                        var ext = 'mp4';
                        if (d.encoded === '') ext = 'm2ts';

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
            label: 'オリジナル(m2ts)',
            value: ''
        });

        if (program.encoded_original) {
            encoded.push({
                label: 'オリジナル(mp4)',
                value: 'org'
            });
        }

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
            },
            {
                key: 'original',
                label: 'オリジナル',
                input: {
                    type: 'checkbox',
                    val: set.original,
                    label: 'm2tsが削除された場合にエンコードのソースとして利用されるようになります'
                },
                depends: [
                    { key: 'encoded', val: 'new' }
                ]
            }
        ];

        if (program.encoded_original) {
            fields.push({
                key: 'size',
                label: 'サイズ',
                text: program.encoded_original.config.size || '無変換',
                depends: [
                    { key: 'encoded', val: 'org' }
                ]
            });

            fields.push({
                key: 'quality',
                label: '品質',
                text: program.encoded_original.config.quality,
                depends: [
                    { key: 'encoded', val: 'org' }
                ]
            });
        }

        if (program.encoded) {
            program.encoded.forEach((element, index) => {
                fields.push({
                    key: 'size',
                    label: 'サイズ',
                    text: element.config.size || '無変換',
                    depends: [
                        { key: 'encoded', val: index }
                    ]
                });

                fields.push({
                    key: 'quality',
                    label: '品質',
                    text: element.config.quality,
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
    play: function (id) {

        this.isPlaying = true;

        var p = this.program;
        var d = this.d;

        var getPreviewURI = function (pos) {

            var r = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');
            r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/preview.jpg';
            var q = 'width=480&height=270&pos=' + pos;

            return r + '?' + q;
        };

        // create video view

        var videoContainer = new flagrate.Element('div', {
            'class': 'video-container'
        }).insertTo(this.view.content);

        var video = new flagrate.Element('video', {
            'class': 'video-js vjs-fluid',
            'id': 'amumu-video',
            'data-setup': '{}',
            autoplay: false,
            controls: true,
            poster: getPreviewURI(0)
        }).insertTo(videoContainer);

        if (id) {
            var getRequestURI = function () {

                var r = location.protocol + '//' + 'localhost:30782';
                r += '/api/hls/' + id + '/playlist.m3u8';

                return r;
            };

            new flagrate.Element('source', {
                src: getRequestURI(),
                type: 'application/x-mpegURL'
            }).insertTo(video);

        } else {
            var getRequestURI = function () {

                var r = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');
                r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/watch.mp4';
                var q = Object.toQueryString(d);

                return r + '?' + q;
            };

            new flagrate.Element('source', {
                src: getRequestURI(),
                type: 'video/mp4'
            }).insertTo(video);

        }

        video.volume = 1;

        this.player = videojs('amumu-video');

        return this;
    }
});
