"use strict";
const child_process = require('child_process');
const Command = require('./command');
const fs = require('fs');


// filterとconfigをmp4を受け入れられるように変更する！
const FormatCpu = {
    filter: (d, h) => {
        let filter = [];
        if (d) filter.push('yadif=0');
        if (h) filter.push('scale=-1:' + h);
        return filter.length ? ['-vf', filter.join(',')] : [];
    },
    codec: () => {
        return ['libx264'];
    },
    quality: (q) => {
        const qualityParam = {
            'high': '20',
            'medium': '24',
            'low': '30'
        };
        return ['-crf', qualityParam[q], '-preset', 'veryfast'];
    }
}

const FormatQsv = {
    // ハードウェアデコーダを指定すると動かないので、ffmpegがバージョンアップしたら試す。
    // https://trac.ffmpeg.org/ticket/6418
    // todo ffprobe + ss指定で　Iフレームの頭だしをする。
    config: (d, h, info) => {
        let ret = [];

        switch (info.streams[0].codec_name) {
            case 'mpeg2video':
                ret.push('-c:v', 'mpeg2_qsv');
                break;
            case 'h264':
                ret.push('-c:v', 'h264_qsv');
                break;
        }
        return ret;
    },
    filter: (d, h) => {
        let filter = [];
        if (d) filter.push('yadif=0');
        if (h) filter.push('scale=-1:' + h);
        //if (d) filter.push('deinterlace_qsv'); //not work on my windows
        //if (h) filter.push('scale_qsv=-1:' + h);
        return filter.length ? ['-vf', filter.join(',')] : [];
    },
    /*
    filter: (d, h) => {
        let filter = [];
        if (d) filter.push('yadif=0');
        if (h) filter.push('scale=-1:' + h);
        return filter.length ? ['-vf', filter.join(',')] : [];
    },
    */
    codec: () => {
        return ['h264_qsv'];
    },
    quality: (q) => {
        const qualityParam = {
            'high': '18',
            'medium': '22',
            'low': '26'
        };
        return ['-q:v', qualityParam[q], '-look_ahead', '0'];
    }
}

const FormatVaapi = {
    config: (d, h, info) => {
        return ['-vaapi_device', '/dev/dri/renderD128', '-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi']
    },
    filter: (d, h) => {
        let filter = ['format=nv12|vaapi', 'hwupload'];
        if (d) filter.push('deinterlace_vaapi');
        if (h) filter.push('scale_vaapi=-1:' + h);
        return ['-vf', filter.join(',')];
    },
    codec: () => {
        return ['h264_vaapi'];
    },
    quality: (q) => {
        const qualityParam = {
            'high': '20',
            'medium': '28',
            'low': '38'
        }
        return ['-qp', qualityParam[q], '-look_ahead', '0']
    }
}

const FormatNvenc = {
    config: (d, h, info) => {
        var ret = ['-hwaccel', 'cuvid'];

        switch (info.streams[0].codec_name) {
            case 'mpeg2video':
                ret.push('-c:v', 'mpeg2_cuvid');
                break;
            case 'h264':
                ret.push('-c:v', 'h264_cuvid');
                break;
        }

        if (d) ret.push('-deint', 'adaptive', '-drop_second_field', 'true');
        if (h) {
            let w = Math.floor((h / info.streams[0].height) * info.streams[0].width);
            ret.push('-resize', `${w}x${h}`);
        }
        return ret;
    },
    filter: (d, h) => {
        return [];
    },
    codec: () => {
        return ['h264_nvenc'];
    },
    quality: (q) => {
        const qualityParam = {
            'high': '20',
            'medium': '28',
            'low': '38'
        }
        return ['-qp', qualityParam[q]]
    }
}


class FormatHls {
    constructor(format, seek, index) {
        this.format = format;
        this.seek = seek;
        this.index = index;
    }

    config(d, h, info) {
        const args = this.format.config ? this.format.config(d, h, info) : [];
        args.push('-ss', this.ss);
        return args;
    }
    filter(d, h) {
        return this.format.filter ? this.format.filter(d, h) : [];
    }
    codec() {
        return this.format.codec ? this.format.codec() : [];
    }
    quality(q) {
        return this.format.quality ? this.format.quality(q) : [];
    }
    output() {
        return ['-f', 'segment', '-flags', '+loop-global_header', '-segment_format', 'mpegts', 'segment_%04d.ts'];
    }
}

async function _getInfo(input) {
    var ret;
    await new Promise((resolve, reject) => {
        child_process.exec('ffprobe -v 0 -show_streams -of json "' + input + '"', function (err, std) {

            if (err) {
                reject(err);
            }
            try {
                resolve(JSON.parse(std));
            } catch (e) {
                reject(err);
            }
        });
    }).then((info) => {
        ret = info;
    });
    return ret;
}

async function _createArgs(input, config) {
    let args = ['-analyzeduration', '30M', '-probesize', '30M', '-user_agent', 'amumu_ffmpeg'];
    let format;
    switch (config.hardware) {
        case 'qsv':
            format = FormatQsv;
            break;
        case 'vaapi':
            format = FormatVaapi;
            break;
        case 'nvenc':
            format = FormatNvenc;
            break;
        default:
            format = FormatCpu;
    };

    const ext = input.match(/\.([^\.]+?$)/)[1];
    let ss = 1;
    let info = await _getInfo(input);

    // hls
    if (config.hls && config.ss) {
        console.log(info);
        ss += config.ss;
    }
    if (ss) args.push('-ss', ss);

    if (format.config) Array.prototype.push.apply(args, format.config(config.deinterlace, config.size, info));

    args.push('-i');
    args.push('<input>');

    Array.prototype.push.apply(args, format.filter(config.deinterlace, config.size));
    args.push('-c:v');
    Array.prototype.push.apply(args, format.codec());
    if (config.hls) {
        args.push('-g', '30');
    }
    Array.prototype.push.apply(args, format.quality(config.quality));
    args.push('-tune', 'zerolatency');
    args.push('-c:a', 'aac')

    if (config.hls) {
        args.push('-f', 'segment');
        args.push('-segment_time', `${config.duration}`);
        if (config.index) args.push('-segment_start_number', config.index);
        args.push('-flags', '+loop-global_header');
        args.push('-segment_format', 'mpegts', '<output>');
    } else {
        args.push('-movflags', 'faststart');
        args.push('-y');
        args.push('<output>');
    }

    return args;
}

exports.exec = async (input, output, config) => {
    let args = await _createArgs(input, config);

    let toutput = output;
    if (!config.hls) {
        toutput = output.replace(/([^\/]+)(\.[^\.]+$)/, '$1_tmp$2');
    }

    const proc = Command.exec(input, toutput, 'ffmpeg', args);

    if (!config.hls) {
        proc.once('exit', (code, signal) => {
            // killされた場合もcode = nullなので成功にはならない
            if (code === 0) {
                // 成功
                fs.rename(toutput, output, () => { });
            } else {
                // 失敗
                fs.unlink(toutput, () => { });
            }
        });
    }

    return proc;
}

