(async function () {
	const id = await hls.createHlsStream(request.param.id, request.query);

	if (!id) return response.error(404);

	response.head(200);
	response.end(JSON.stringify({
		id: id
	}, null, '  '));

	return;
})();
