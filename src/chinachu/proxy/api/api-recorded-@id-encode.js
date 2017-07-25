(async function () {

	let program = await manager.getProgramById(request.param.id);

	if (program === null) return response.error(404);

	if (!fs.existsSync(program.recorded)) return response.error(410);

	switch (request.method) {
		case 'PUT':

			program.option = request.query;
			program.reencode = true;

			const err = await new Promise((resolve, reject) => {
				workQueue.queueJob('amumu_encode', program, { priority: 'high' }, (err) => {
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
