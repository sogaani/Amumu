init();

async function init() {
	var program = await db.getProgramById(request.param.id);

	if (program === null || !request.query.encoded || request.query.encoded === 'raw') {
		if (request.type === 'm3u8') {
			return main(null, await chinachu.getProgramById(request.param.id), null);
		}
		return request.redirect();
	}

	if (program.tuner && program.tuner.isScrambling) return response.error(409);

	let file = program.recorded;

	try {
		if (request.query && request.query.encoded) {
			switch (request.query.encoded) {
				case 'org':
					file = encodedPath + program.encoded_original.file;
					break;
				default:
					file = encodedPath + program.encoded[parseInt(request.query.encoded, 10)].file;
					break;
			}
		}
	} catch (e) {
		return response.error(405);
	}

	if (!fs.existsSync(file)) return response.error(410);

	// probing
	child_process.exec('ffprobe -v 0 -show_format -of json "' + file + '"', function (err, std) {

		if (err) {
			console.log("error", err);
			return response.error(500);
		}
		try {
			main(JSON.parse(std), program, file);
		} catch (e) {
			console.log(e);
			return response.error(500);
		}
	});
}

function main(avinfo, program, file) {

	if (request.query.debug) {
		console.log(avinfo ? JSON.stringify(avinfo, null, '  ') : null);
		console.log(JSON.stringify(request.headers, null, '  '));
	}

	switch (request.type) {
		case 'm3u8':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.m3u8"');
			response.head(200);

			var ext = request.query.ext || 'm2ts';
			var prefix = request.query.prefix || '';

			var target = prefix + 'watch.' + ext + url.parse(request.url).search;
			response.write('#EXTM3U\n');
			response.write('##EXTINF:-1,' + program.title + '\n');
			response.write(target.replace(/&/g, '&amp;') + '\n');
			response.end();
			return;

		case 'mp4':
			console.log('STREAMING: ' + request.url);

			// Caluculate Total Size
			var tsize = parseInt(avinfo.format.size, 10);

			if (request.query.mode == 'download') {
				var pi = path.parse(file);
				response.setHeader('Content-disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(pi.name + '.mp4'));
			}

			// Ranges Support
			var range = {
				start: 0
			};

			if (request.headers.range) {
				var bytes = request.headers.range.replace(/bytes=/, '').split('-');
				var rStart = parseInt(bytes[0], 10);
				var rEnd = parseInt(bytes[1], 10) || tsize - 1;

				range.start = rStart;
				range.end = rEnd;

				response.setHeader('Accept-Ranges', 'bytes');
				response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + tsize);
				response.setHeader('Content-Length', rEnd - rStart + 1);

				response.head(206);
			} else {
				response.setHeader('Accept-Ranges', 'bytes');
				response.setHeader('Content-Length', tsize);

				response.head(200);
			}

			var readStream = fs.createReadStream(file, range || {});

			request.on('close', function () {
				readStream.destroy();
				readStream = null;
			});

			readStream.pipe(response);

			return;
		case 'm2ts':
			return request.redirect();
	}//<--switch
}