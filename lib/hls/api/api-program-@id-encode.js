(async function () {
	const playlistUrl = await hls.createHlsStream(request.param.id, request.query);

	if (!playlistUrl) return response.error(404);

	response.head(200);
	response.end(JSON.stringify({
		playlistUrl: 'http://' + request.headers.host + playlistUrl
	}, null, '  '));

	return;
})();
