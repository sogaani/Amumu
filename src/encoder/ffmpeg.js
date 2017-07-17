"use strict";
const child_process = require('child_process');
const Command = require('./command');

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
    /*
    config: (d, h, info) => {
        return ['-hwaccel', 'qsv', '-c:v', 'mpeg2_qsv']; //not work on my windows
    },
    filter: (d, h) => {
        let filter = [];
        if (d) filter.push('deinterlace_qsv');
        if (h) filter.push('scale_qsv=-1:' + h, 'hwdownload', 'format=nv12');
        return filter.length ? ['-vf', filter.join(',')] : [];
    },
    */
    filter: (d, h) => {
        let filter = [];
        if (d) filter.push('yadif=0');
        if (h) filter.push('scale=-1:' + h);
        return filter.length ? ['-vf', filter.join(',')] : [];
    },
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
            'high': '18',
            'medium': '22',
            'low': '26'
        }
        return ['-qp', qualityParam[q], '-look_ahead', '0']
    }
}

const FormatNvenc = {
    config: (d, h, info) => {
        var ret = ['-hwaccel', 'cuvid', '-c:v', 'mpeg2_cuvid'];
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
            'high': '18',
            'medium': '22',
            'low': '26'
        }
        return ['-qp', qualityParam[q]]
    }
}

class Ffmpeg {
    constructor(input, output, config) {
        this.process = process;
        this.input = input;
        this.output = output;
        this.debug = config.debug || null;
        this.config = config;
    }
    async getInfo(input) {
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
        }).then((info) =>{
            ret = info;
        });
        return ret;
    }

    async exec(replacement) {
        let args = [];
        let format;
        switch (this.config.hardware) {
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
        let info = await this.getInfo(this.input);
        console.log(info);
        //if (this.debug) args.push('-ss', '10');
        //if (this.debug) args.push('-loglevel', '56');
        if (format.config) Array.prototype.push.apply(args, format.config(this.config.deinterlace, this.config.size, info));
        args.push('-i');
        args.push('<input>');
        //if (this.debug) args.push('-t', '60');
        Array.prototype.push.apply(args, format.filter(this.config.deinterlace, this.config.size));
        args.push('-c:v');
        Array.prototype.push.apply(args, format.codec());
        Array.prototype.push.apply(args, format.quality(this.config.quality));
        args.push('-tune', 'zerolatency');
        args.push('-c:a', 'aac')
        args.push('-movflags', 'faststart');
        args.push('-y');
        args.push('<output>');

        let command = new Command(this.input, this.output, 'ffmpeg', args)
        await command.exec(replacement);
    }
}

module.exports = Ffmpeg;
