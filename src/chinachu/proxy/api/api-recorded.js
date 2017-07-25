(async function () {

	const programs = await manager.getPrograms();

	switch (request.method) {
		case 'GET':
			{
				const recorded = await chinachu.getRecorded();
				const length = recorded.length;

				for (let i = 0; i < length; i++) {
					const program = await manager.getProgramById(recorded[i].id);
					if (!program) {
						programs.push(recorded[i]);
					}
				}

				response.head(200);
				response.end(JSON.stringify(recorded));
			}
			break;

		case 'PUT':
			{
				const plength = programs.length;

				for (let i = 0; i < plength; i++) {
					if (!fs.existsSync(programs[i].recorded)) {
						await manager.removeProgram(programs[i]);

						if (programs.encoded.length) {
							programs.encoded.forEach((element) => {
								if (fs.existsSync(element.file)) fs.unlinkSync(element.file);
							});
						}

					}
				}

				programs = await manager.getPrograms();

				const recorded = await chinachu.cleanup();
				const rlength = recorded.length;

				for (let i = 0; i < rlength; i++) {
					const program = await manager.getProgramById(recorded[i].id);
					if (!program) {
						programs.push(recorded[i]);
					}
				}

				response.head(200);
				response.end(JSON.stringify(programs, null, '  '));
			}
			break;
	}

})();