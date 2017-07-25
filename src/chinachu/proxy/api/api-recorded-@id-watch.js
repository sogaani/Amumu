init();

async function init() {
	try {
		var program = await manager.getProgramById(request.param.id);

		if (program === null) return proxy.web(request, response);

		if (program.tuner && program.tuner.isScrambling) return response.error(409);

		let file = program.recorded;

		try {
			if (request.query && request.query.encoded) file = program.encoded[request.query.encoded].file;
		} catch (e) {
			file = null;
		}

		if (!file || !fs.existsSync(file)) return response.error(410);

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
	} catch (e) {
		console.log(e);
	}
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

			var ext = request.query.ext || 'mp4';
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
		case 'mp4':
			console.log('STREAMING: ' + request.url);

			// Caluculate Total Size
			var isize = parseInt(avinfo.format.size, 10);

			if (request.query.mode == 'download') {
				var pi = path.parse(file);
				response.setHeader('Content-disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(pi.name + '.' + request.query.ext));
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
	}//<--switch
}