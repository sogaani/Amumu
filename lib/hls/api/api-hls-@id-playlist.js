async function main() {

	const stream = hls.getHlsById(request.param.id);

	if (!stream) return response.error(404);

	switch (request.type) {
		case 'm3u8':
			response.setHeader('Access-Control-Allow-Origin', '*');
			response.head(200);

			response.write(stream.getPlaylist('http://' + request.headers.host));

			response.end();
			return;
		default:
			return;
	}
};

main();