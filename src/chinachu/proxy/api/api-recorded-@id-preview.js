(async function () {

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

	response.head(200);

	var width = request.query.width;
	var height = request.query.height;

	if (request.query.size && (request.query.size.match(/^[1-9][0-9]{0,3}x[1-9][0-9]{0,3}$/) !== null)) {
		width = request.query.size.split('x')[0];
		height = request.query.size.split('x')[1];
	}

	width = parseInt(width, 10).toString(10);
	height = parseInt(height, 10).toString(10);
	if (width === 'NaN' || width === '0') width = '320';
	if (height === 'NaN' || height === '0') height = '180';

	width = parseInt(width, 10).toString(10);
	height = parseInt(height, 10).toString(10);
	if (width === 'NaN' || width === '0') width = '320';
	if (height === 'NaN' || height === '0') height = '180';

	var vcodec = 'mjpeg';

	if (request.query.type && (request.query.type === 'jpg')) { vcodec = 'mjpeg'; }
	if (request.query.type && (request.query.type === 'png')) { vcodec = 'png'; }
	if (request.type === 'jpg') { vcodec = 'mjpeg'; }
	if (request.type === 'png') { vcodec = 'png'; }
	if (request.type === 'txt') { vcodec = 'mjpeg'; }

	var pos = request.query.pos || '5';

	pos = (parseInt(pos, 10) - 1.5).toString(10);

	var ffmpeg = child_process.exec(
		(
			'ffmpeg -ss ' + pos + ' -r 10 -i "' + file + '" -ss 1.5 -r 10 -frames:v 1' +
			' -c:v ' + vcodec + ' -an -f image2 -s ' + width + 'x' + height + ' -map 0:0 -y pipe:1'
		)
		,
		{
			encoding: 'binary',
			maxBuffer: 3200000
		}
		,
		function (err, stdout, stderr) {
			if (err) {
				util.log(err);
				return response.error(503);
			}

			if (request.type === 'txt') {
				if (vcodec === 'mjpeg') {
					response.end('data:image/jpeg;base64,' + new Buffer(stdout, 'binary').toString('base64'));
				} else if (vcodec === 'png') {
					response.end('data:image/png;base64,' + new Buffer(stdout, 'binary').toString('base64'));
				}
			} else {
				response.end(stdout, 'binary');
			}
			clearTimeout(timeout);
		}
	);

	var timeout = setTimeout(function () {
		ffmpeg.kill('SIGKILL');
	}, 3000);

})();
