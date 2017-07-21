init();

async function init() {
	try {
		const program = await chinachu.getProgramById(request.param.id);

		program.recorded = recordedPath + program.recorded.match(/.+\/([^\/]+)/)[1];
		console.log(program.recorded);
		if (program === null) {
			response.error(404);
		}

		if (program.tuner && program.tuner.isScrambling) return response.error(409);

		if (!fs.existsSync(program.recorded)) return response.error(410);

		// probing
		child_process.exec('ffprobe -v 0 -show_format -of json "' + program.recorded + '"', function (err, std) {

			if (err) {
				console.log("error", err);
				return response.error(500);
			}

			try {
				main(JSON.parse(std),program);
			} catch (e) {
				console.log(e);
				return response.error(500);
			}
		});
	} catch (e) {
		console.log(e);
	}
}

function main(avinfo,program) {

	if (request.query.debug) {
		console.log(JSON.stringify(avinfo, null, '  '));
		console.log(JSON.stringify(request.headers, null, '  '));
	}

	switch (request.type) {
		case 'xspf':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.xspf"');
			response.head(200);

			var ext = request.query.ext || 'm2ts';
			var prefix = request.query.prefix || '';

			var target = prefix + 'watch.' + ext + url.parse(request.url).search;

			response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
			response.write('<playlist version="1" xmlns="http://xspf.org/ns/0/">\n');
			response.write('<trackList>\n');
			response.write('<track>\n<location>' + target.replace(/&/g, '&amp;') + '</location>\n');
			response.write('<title>' + program.title + '</title>\n</track>\n');
			response.write('</trackList>\n');
			response.write('</playlist>\n');

			response.end();
			return;

		case 'm2ts':
		case 'webm':
		case 'mp4':
			console.log('STREAMING: ' + request.url);

			var d = {
				ss: request.query.ss || '0',  //start(seconds)
				t: request.query.t || null, //duration(seconds)
				s: request.query.s || null, //size(WxH)
				f: request.query.f || null, //format
				'c:v': request.query['c:v'] || null, //vcodec
				'c:a': request.query['c:a'] || null, //acodec
				'b:v': request.query['b:v'] || null, //bitrate
				'b:a': request.query['b:a'] || null, //ab
				ar: request.query.ar || null, //ar(Hz)
				r: request.query.r || null  //rate(fps)
			};

			var rtype = program.recorded.match(/\.([^\.]+?$)/)[1];
			var offset = rtype === 'm2ts' ? 2 : 0;

			if (request.type === 'm2ts' && request.type !== rtype) request.type = rtype;

			if (parseInt(d.ss, 10) < offset) {
				d.ss = String(offset);
			}

			if (parseInt(d.ss, 10) > parseFloat(avinfo.format.duration)) {
				return response.error(416);
			}

			// Convert humanized size String to Bitrate
			var bitrate = 0;
			var videoBitrate = 0;
			var audioBitrate = 0;
			if (d['b:v'] !== null) {
				if (d['b:v'].match(/^[0-9]+k$/i)) {
					videoBitrate = parseInt(d['b:v'].match(/^([0-9]+)k$/i)[1], 10) * 1024;
				} else if (d['b:v'].match(/^[0-9]+m$/i)) {
					videoBitrate = parseInt(d['b:v'].match(/^([0-9]+)m$/i)[1], 10) * 1024 * 1024;
				}
				if (d['c:a'] === 'copy' || d['b:a'] === null) {
					d['c:a'] = null;
					d['b:a'] = '96k';
				}
			}
			if (d['b:a'] !== null) {
				if (d['b:a'].match(/^[0-9]+k$/i)) {
					audioBitrate = parseInt(d['b:a'].match(/^([0-9]+)k$/i)[1], 10) * 1024;
				} else if (d['b:a'].match(/^[0-9]+m$/i)) {
					audioBitrate = parseInt(d['b:a'].match(/^([0-9]+)m$/i)[1], 10) * 1024 * 1024;
				}
			}
			if (videoBitrate !== 0 && audioBitrate !== 0) {
				bitrate = videoBitrate + audioBitrate;
			}

			// Caluculate Total Size
			var isize = parseInt(avinfo.format.size, 10);
			var ibitrate = parseFloat(avinfo.format.bit_rate);
			var tsize = 0;
			if (bitrate === 0) {
				bitrate = ibitrate;
				tsize = isize;
			} else {
				tsize = bitrate / 8 * parseFloat(avinfo.format.duration);
			}
			if (d.t) {
				tsize = tsize / parseFloat(avinfo.format.duration) * parseInt(d.t, 10);
			} else {
				tsize -= bitrate / 8 * (parseInt(d.ss, 10) - offset);
			}
			tsize = Math.floor(tsize);

			if (request.query.mode == 'download') {
				var pi = path.parse(program.recorded);
				response.setHeader('Content-disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(pi.name + '.' + request.query.ext));
			}

			// Ranges Support
			var range = {
				start: parseInt(ibitrate / 8 * (parseInt(d.ss, 10) - offset), 10)
			};

			if ((request.type === 'm2ts') || (d['c:v'] === 'copy' && d['c:a'] === 'copy')) {
				if (request.headers.range) {
					var bytes = request.headers.range.replace(/bytes=/, '').split('-');
					var rStart = parseInt(bytes[0], 10);
					var rEnd = parseInt(bytes[1], 10) || tsize - 1 - offset;

					range.start = bitrate == ibitrate ? rStart : Math.round(rStart / bitrate * ibitrate);
					range.end = bitrate == ibitrate ? rEnd : Math.round(rEnd / bitrate * ibitrate);
					var limit = 20 * 1024 * 1024;
					var len = rEnd - rStart + 1;
					if (len > limit) {
						len = limit;
						rEnd = range.end = len + range.start - 1;
					}
					if (range.start > isize || range.end > isize) {
						return response.error(416);
					}
					response.setHeader('Accept-Ranges', 'bytes');
					response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + tsize);
					response.setHeader('Content-Length', rEnd - rStart + 1);

					response.head(206);
				} else {
					response.setHeader('Accept-Ranges', 'bytes');
					response.setHeader('Content-Length', tsize);

					response.head(200);
				}
			} else {
				response.head(200);
			}

			switch (request.type) {
				case 'm2ts':
					d.f = 'mpegts';
					d['c:v'] = d['c:v'] || 'copy';
					d['c:a'] = d['c:a'] || 'copy';
					break;
				case 'mp4':
					d.f = 'mp4';
					d['c:v'] = d['c:v'] || (request.type === rtype ? 'copy' : 'h264');
					d['c:a'] = d['c:a'] || (request.type === rtype ? 'copy' : 'aac');
					break;
				case 'webm':
					d.f = 'webm';
					d['c:v'] = d['c:v'] || (request.type === rtype ? 'copy' : 'vp9');
					d['c:a'] = null;
					break;
			}

			var args = [];

			if (!request.query.debug) args.push('-v', '0');

			var readStream;
			if (d['c:v'] === 'copy' && d['c:a'] === 'copy') {
				readStream = fs.createReadStream(program.recorded, range || {});

				request.on('close', function () {
					readStream.destroy();
					readStream = null;
				});
				args.push('-i', 'pipe:0');
			} else {
				args.push('-ss', d.ss);
				args.push('-i', program.recorded);
			}

			if (d.t) { args.push('-t', d.t); }

			args.push('-threads', '0');

			if (!(d['c:v'] === 'copy' && d['c:a'] === 'copy')) {

				args.push('-filter:v', 'yadif');
			}

			if (d['c:v']) {
				args.push('-c:v', d['c:v']);
			}
			if (d['c:a']) args.push('-c:a', d['c:a']);

			if (d.s) {
				args.push('-s', d.s);
			}
			if (d.r) args.push('-r', d.r);
			if (d.ar) args.push('-ar', d.ar);

			if (d['b:v']) {
				args.push('-b:v', d['b:v'], '-minrate:v', d['b:v'], '-maxrate:v', d['b:v']);
				args.push('-bufsize:v', videoBitrate * 8);
			}
			if (d['b:a']) {
				args.push('-b:a', d['b:a'], '-minrate:a', d['b:a'], '-maxrate:a', d['b:a']);
				args.push('-bufsize:a', audioBitrate * 8);
			}

			if (d['c:v'] === 'h264') {
				args.push('-profile:v', 'baseline');
				args.push('-preset', 'ultrafast');
				args.push('-tune', 'fastdecode,zerolatency');
			}
			if (d['c:v'] === 'h264_vaapi') {
				args.push('-profile', '77');
				args.push('-level', '41');
			}
			if (d['c:v'] === 'vp9') {
				args.push('-deadline', 'realtime');
				args.push('-speed', '4');
				args.push('-cpu-used', '-8');
			}

			if (d.f === 'mp4') {
				if (d['c:v'] === 'copy' && d['c:a'] === 'copy') {
					args.push('-movflags', 'frag_keyframe+faststart+default_base_moof');
				} else {
					args.push('-movflags', 'frag_keyframe+empty_moov+faststart+default_base_moof');
				}
			}

			args.push('-y', '-f', d.f, 'pipe:1');

			if (d['c:v'] === 'copy' && d['c:a'] === 'copy' && !d.t) {
				readStream.pipe(response);
			} else {
				const ffmpeg = child_process.spawn('ffmpeg', args);
				children.push(ffmpeg.pid);
				console.log('SPAWN: ffmpeg ' + args.join(' ') + ' (pid=' + ffmpeg.pid + ')');

				ffmpeg.stdout.pipe(response);

				if (rtype === 'm2ts') {
					readStream.pipe(ffmpeg.stdin);
				}

				ffmpeg.stderr.on('data', function (d) {
					console.log('#ffmpeg: ' + d);
				});

				ffmpeg.on('exit', function () {
					response.end();
				});

				request.on('close', function () {
					ffmpeg.stdout.removeAllListeners('data');
					ffmpeg.stderr.removeAllListeners('data');
					ffmpeg.kill('SIGKILL');
				});
			}

			return;
	}//<--switch
}