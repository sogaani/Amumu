(async function () {

    var program = await db.getProgramById(request.param.id);
console.log(request.param.id);
    if (program === null) {
        return request.redirect();
    }

    let file = program.recorded;

    try {
        if (request.query && request.query.encoded) {
            switch (request.query.encoded) {
                case 'org':
                    file = encodedPath + program.encoded_original.file;
                    break;
                default:
                    file = encodedPath + program.encoded[parseInt(request.query.encoded, 10)].file;
                    break;
            }
        }
    } catch (e) {
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Pragma', 'no-cache');
        return response.error(405);
    }


    switch (request.method) {
        case 'GET':
            response.head(200);
            response.end(JSON.stringify(program, null, '  '));
            return;

        case 'DELETE':
            response.head(200);

            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }

            if (request.query && request.query.encoded) {
                switch (request.query.encoded) {
                    case 'org':
                        break;
                    default:
                        await db.removeEncoded(program, program.encoded[parseInt(request.query.encoded, 10)]);
                        break;
                }
            }

            response.end('{}');

            return;
    }

})();