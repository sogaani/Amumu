(async function () {

	let program = await chinachu.getRecordingProgramById(request.param.id);

	if (!program) return response.error(404);

	switch (request.method) {
		case 'POST':
			try {
				const body = await encoder.encode(request.param.id, request.query);

				if (!body) return response.error(404);

				const playlistUrl = new url.URL(body.playlistUrl);

				if (playlistUrl.hostname === 'localhost') playlistUrl.hostname = request.headers.host.replace(/:[0-9]*$/, '');

				body.playlistUrl = playlistUrl.href;

				response.head(200);
				response.end(JSON.stringify(body, null, '  '));

			} catch (e) {
				console.log(e);
				return response.error(404);
			}
			return;
	}

})();
