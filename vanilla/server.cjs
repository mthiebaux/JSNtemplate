
//import { /* globalThis.rpc_array_sum */ } from './client.js';

//const client = require( "./client.js" );


const http = require( "http" );
const fs = require( "fs" );
const path = require( "path" );

const port = 8080;

/////////////////////////////////////////////////////////

// Can't import without modules

globalThis.rpc_process_command =
function rpc_process_command( input )	{

	console.log( "Server RPC" );
	console.log( input );

	let output = {};
	if( input.cmd === "add" )	{

		let sum = 0;
		for( let v of input.args )	{
			sum += v;
		}
		output.value = sum;
	}
	else
	if( input.cmd === "mul" )	{

		let prod = 1;
		for( let v of input.args )	{
			prod *= v;
		}
		output.value = prod;
	}
	else	{
		output.value = "cmd \'" + input.cmd + "\' not found"
	}

	return( output );
}

/////////////////////////////////////////////////////////

const server = http.createServer(

	( request, response ) => {

		console.log( request.method + ": " + request.url );

		if( request.method === "GET" )	{

			if( request.url === "/api" )	{

				response.write( JSON.stringify( { msg: "GET api request received" } ) );

				// extract params from url ??

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

//						output.result = rpc_process_command( input_obj );
						output.result = globalThis[ input_obj.rpc ]( input_obj );

						console.log( JSON.stringify( output, null, 2 ) );
					}

					response.write(
						JSON.stringify( output )
					);
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

