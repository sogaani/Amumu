async function main() {

	const stream = hls.getHlsById(request.param.id);

	if (!stream) return response.error(404);

	const ts = stream.getTsByIndex(parseInt(request.param.index, 10));

	if (!ts) return response.error(404);

	if (ts.isAvailable()) {
		console.log('STREAMING: ' + request.url);

		response.setHeader('Access-Control-Allow-Origin', '*');

		// Caluculate Total Size
		const size = ts.stat().size;

		// Ranges Support
		var range = {
			start: 0
		};

		if (request.headers.range) {
			var bytes = request.headers.range.replace(/bytes=/, '').split('-');
			var rStart = parseInt(bytes[0], 10);
			var rEnd = parseInt(bytes[1], 10) || size - 1;

			range.start = rStart;
			range.end = rEnd;

			response.setHeader('Accept-Ranges', 'bytes');
			response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + size);
			response.setHeader('Content-Length', rEnd - rStart + 1);

			response.head(206);
		} else {
			response.setHeader('Accept-Ranges', 'bytes');
			response.setHeader('Content-Length', size);

			response.head(200);
		}

		var readStream = ts.getStream(range || {});

		request.on('close', () => {
			readStream.destroy();
			readStream = null;
		});

		readStream.pipe(response);

		return;
	} else if (ts === stream.creatingFile) {
		setTimeout(main, 1000);
	} else {
		// エンコード完了未定

		// timeoutで再度呼び出し // 長めのtimeoutにしておく？
		setTimeout(main, 1000);
	}
};

main();