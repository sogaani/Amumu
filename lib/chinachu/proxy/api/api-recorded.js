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
					const program = programs[i];
					if (!await chinachu.existFile(program.id) && !fs.existsSync(encodedPath + program.encoded_original.file)) {
						await db.removeProgram(program);

						if (program.encoded.length) {
							programs.encoded.forEach((element) => {
								if (fs.existsSync(encodedPath + element.file)) fs.unlinkSync(encodedPath + element.file);
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