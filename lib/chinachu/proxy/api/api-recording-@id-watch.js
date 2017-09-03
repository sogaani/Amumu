init();

async function init() {

	if (!recordingPath) {
		return request.redirect();
	}

	var program = await chinachu.getRecordingProgramById(request.param.id) || await chinachu.getProgramById(request.param.id);

	if (program === null) {
		return response.error(404);
	}

	if (program.tuner && program.tuner.isScrambling) return response.error(409);

	let file = recordingPath + program.recorded.match(/\/([^\/\\]+?)$/)[1];

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
		console.log(JSON.stringify(avinfo, null, '  '));
		console.log(JSON.stringify(request.headers, null, '  '));
	}

	switch (request.type) {
		case 'xspf':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.xspf"');
			response.head(200);

			var prefix = request.query.prefix || '';

			var target = prefix + 'watch.m2ts' + url.parse(request.url).search;

			response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
			response.write('<playlist version="1" xmlns="http://xspf.org/ns/0/">\n');
			response.write('<trackList>\n');
			response.write('<track>\n<location>' + target.replace(/&/g, '&amp;') + '</location>\n');
			response.write('<title>' + program.title + '</title>\n</track>\n');
			response.write('</trackList>\n');
			response.write('</playlist>\n');

			response.end();
			return;

		case 'm3u8':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.m3u8"');
			response.head(200);

			var prefix = request.query.prefix || '';

			var target = prefix + 'watch.m2ts' + url.parse(request.url).search;
			response.write('#EXTM3U\n');
			response.write('##EXTINF:-1,' + program.title + '\n');
			response.write(target.replace(/&/g, '&amp;') + '\n');
			response.end();
			return;

		case 'm2ts':
			console.log('STREAMING: ' + request.url);

			// Caluculate Total Size
			var tsize = parseInt(avinfo.format.size, 10);
			var lsize = (Math.floor(tsize / parseFloat(avinfo.format.duration) / 100000) + 1) * 100000 * program.seconds;

			// Ranges Support
			var range = {
				start: 0
			};

			if (request.headers['user-agent'] !== 'amumu_ffmpeg' && request.headers.range) {
				var bytes = request.headers.range.replace(/bytes=/, '').split('-');
				var rStart = parseInt(bytes[0], 10);
				var rEnd = parseInt(bytes[1], 10) || lsize - 1;
				if (rStart > tsize) rStart = tsize - 1048576;
				range.start = rStart;
				range.end = rEnd;

				response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + lsize);
				response.setHeader('Content-Length', rEnd - rStart + 1);

				response.head(206);
			} else {
				response.setHeader('Accept-Ranges', 'bytes');

				response.head(200);
			}

			//var readStream = fs.createReadStream(file, range || {});
			var readStream = new readFile(file, range);
			request.on('close', function () {
				readStream.destroy();
				readStream = null;
			});

			readStream.pipe(response);

			return;
	}//<--switch
}