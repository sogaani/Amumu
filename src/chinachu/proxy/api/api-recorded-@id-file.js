(async function () {

	var program = await manager.getProgramById(request.param.id);

	if (program === null) return proxy.web(request, response);

	let file = program.recorded;

	try {
		if (request.query && request.query.encoded) file = program.encoded[request.query.encoded].file;
	} catch (e) {
		file = null;
	}

	if (!file || !fs.existsSync(file)) {
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

			await manager.removeEncoded(program, program.encoded[request.query.encoded]);

			if (request.type === 'json') {
				response.end('{}');
			} else {
				response.end();
			}
			return;
	}

})();