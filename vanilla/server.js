
const http = require( "http" );
const fs = require( "fs" );
const path = require( "path" );

const lib = require( "./lib.js" );

const port = 8080;

/////////////////////////////////////////////////////////

const server = http.createServer(

	( request, response ) => {

		console.log( request.method + ": " + request.url );

		if( request.method === "GET" )	{

			/// extract search key "/api" from head of url string prior to route, then parse query

			if( request.url === "/api" )	{

				response.write( JSON.stringify( { msg: "GET /api request received" } ) );
			}
			else	{

				let url = ".";
				if( request.url === "/" )	{
					url += "/index.html"; // default
				}
				else	{
					url += request.url;
				}

				const content_type = {
					".html":	{ 'Content-Type': 'text/html' },
					".json":	{ 'Content-Type': 'application/json' },
					".js":		{ 'Content-Type': 'application/javascript' },
					".cjs":		{ 'Content-Type': 'application/javascript' }
				};

				try {

					const file_data = fs.readFileSync( url );

					response.writeHead( 200, content_type[ path.extname( url ) ] );
					response.write( file_data );
				}
				catch( err ) {
					console.error( err );
					response.write( JSON.stringify( { error: err, msg: "URL NOT RECOGNIZED" }, null, 2 ) );
				}
			}
			response.end();
		}
		else
		if( request.method === "POST" )	{

			let body_data = ""; // <-- client:fetch( , { body: JSON.stringify( cmd_obj ) } )
			request.on(
				"data",
				( chunk ) => {
					body_data += chunk;
				}
			)

			request.on(
				"end",
				() =>	{

					let input_obj = {};
					if( body_data.length > 0 ) {

						input_obj = JSON.parse( body_data );
					}
					let output = {
						url: request.url,
						input: input_obj
					};

					if( request.url === "/RPC" )	{

						if( typeof globalThis[ input_obj.rpc ] === "function" )	{
							output.result = globalThis[ input_obj.rpc ]( input_obj ); // from lib.js
						}
						else	{
							let msg = "RPC: function \'" + input_obj.rpc + "\' NOT FOUND";
							output.result = { error: msg };
						}
						console.log( output );
					}

					// NOTE: The "chunk" argument must be of type string...
					response.write( JSON.stringify( output ) );
					response.end();
				}
			)
		}

	} // ( request, response ) => {}
);

/////////////////////////////////////////////////////////

server.listen(
	port,
	() => {
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Vanilla Server:                 │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );
	}
);

