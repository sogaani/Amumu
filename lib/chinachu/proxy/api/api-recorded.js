(async function () {

	let programs = await db.getPrograms();
	if (!programs.length) programs = [];

	switch (request.method) {
		case 'GET':
			{
				const recorded = await chinachu.getRecorded();
				const length = recorded.length;

				for (let i = 0; i < length; i++) {
					const program = await db.getProgramById(recorded[i].id);
					if (!program) {
						programs.push(recorded[i]);
					}
				}

				response.head(200);
				response.end(JSON.stringify(programs));
			}
			break;

		case 'PUT':
			{
				const plength = programs.length;

				for (let i = 0; i < plength; i++) {
					if (!fs.existsSync(programs[i].recorded)) {
						await db.removeProgram(programs[i]);

						if (programs.encoded) {
							programs.encoded.forEach((element) => {
								if (fs.existsSync(element.file)) fs.unlinkSync(element.file);
							});
						}

					}
				}

				programs = await db.getPrograms();

				const recorded = await chinachu.cleanup();
				const rlength = recorded.length;

				for (let i = 0; i < rlength; i++) {
					const program = await db.getProgramById(recorded[i].id);
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