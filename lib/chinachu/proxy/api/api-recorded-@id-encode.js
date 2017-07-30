(async function () {

	let program = await db.getProgramById(request.param.id);

	if (program === null) return response.error(404);

	if (!fs.existsSync(program.recorded) && !(program.encoded_original && fs.existsSync(encodedPath + program.encoded_original.file))) return response.error(410);

	switch (request.method) {
		case 'PUT':

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

			return;
	}

})();
