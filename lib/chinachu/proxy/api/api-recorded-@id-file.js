(async function () {

	var program = await db.getProgramById(request.param.id);

	if (program === null || !request.query.encoded || request.query.encoded === '') {
		return request.redirect();
	}


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
		response.setHeader('Cache-Control', 'no-cache');
		response.setHeader('Pragma', 'no-cache');
		return response.error(405);
	}

	if (!fs.existsSync(file)) {
		response.setHeader('Cache-Control', 'no-cache');
		response.setHeader('Pragma', 'no-cache');
		return response.error(410);
	}

	switch (request.method) {
		case 'GET':
			var fstat = fs.statSync(file);

			if (request.type === 'm2ts' || request.type === 'mp4') {
				response.setHeader('content-length', fstat.size);
				response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.' + request.type + '"');
				response.head(200);

				fs.createReadStream(file).pipe(response);
			}

			if (request.type === 'json') {
				response.head(200);

				response.end(JSON.stringify({
					dev: fstat.dev,
					ino: fstat.ino,
					mode: fstat.mode,
					ulink: fstat.ulink,
					uid: fstat.uid,
					gid: fstat.gid,
					rdev: fstat.rdev,
					size: fstat.size,
					blksize: fstat.blksize,
					blocks: fstat.blocks,
					atime: fstat.atime.getTime(),
					mtime: fstat.mtime.getTime(),
					ctime: fstat.ctime.getTime()
				}, null, '  '));
			}

			return;

		case 'DELETE':
			response.head(200);

			fs.unlinkSync(file);

			if (request.query && request.query.encoded) {
				switch (request.query.encoded) {
					case 'org':
						break;
					default:
						await db.removeEncoded(program, program.encoded[parseInt(request.query.encoded, 10)]);
						break;
				}
			}

			if (request.type === 'json') {
				response.end('{}');
			} else {
				response.end();
			}
			return;
	}

})();