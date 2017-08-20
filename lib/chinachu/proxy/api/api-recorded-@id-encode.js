(async function () {

	let program = await db.getProgramById(request.param.id);

	if (!program) {
		const programs = await chinachu.getRecorded();
		const length = programs.length;
		for (let i = 0; i < length; i++) {
			if (programs[i].id === request.param.id) {
				program = programs[i];
				break;
			}
		}
	}

	if (!program) return response.error(404);

	if (!await chinachu.existFile(request.param.id) && !(program.encoded_original && fs.existsSync(encodedPath + program.encoded_original.file))) return response.error(410);

	switch (request.method) {
		case 'PUT':
			if (request.query.hls === "true") {
				try {
					const body = await encoder.encode(request.param.id, request.query);

					if (!body) return response.error(404);

					response.head(200);
					response.end(JSON.stringify(body, null, '  '));

				} catch (e) {
					return response.error(404);
				}
			} else {
				request.query.original = (request.query.original === "true");
				const data = {
					program: program,
					config: request.query
				}

				const err = await new Promise((resolve, reject) => {
					workQueue.queueJob('amumu_encode', data, { priority: 'high' }, (err) => {
						resolve(err);
					});
				});

				if (err) return response.error(500);

				response.head(200);

				if (request.type === 'json') {
					response.end('{}');
				} else {
					response.end();
				}
			}
			return;
	}

})();
