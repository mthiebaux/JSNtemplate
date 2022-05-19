
import http from 'http';
import fs from "fs";
import path from "path";

//import { rpc_process_command } from './lib.js';
import { rpc_process_command } from './lib.mjs';

let rpc_cmd_map = {};

//rpc_cmd_map[ rpc_process_command.name ] = rpc_process_command;
rpc_cmd_map.rpc_process_command = rpc_process_command;

test = rpc_cmd_map[ rpc_process_command.name ]( { contents: "RPC server", cmd: "add", args: [ 6, 7 ] } );
console.log( test );

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
					".mjs":		{ 'Content-Type': 'application/javascript' }
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

					let body_obj = {};
					if( body_data.length > 0 ) {
						body_obj = JSON.parse( body_data );
					}
					let output = {
						report: {
							url: request.url,
							body: body_obj
						}
					};

					// URL parsing...

					if( request.url === "/RPC" )	{

						if( typeof rpc_cmd_map[ body_obj.rpc ] === "function" )	{
							output.result = rpc_cmd_map[ body_obj.rpc ]( body_obj ); // from lib.js/mjs
						}
						else	{
							let msg = "RPC: function \'" + body_obj.rpc + "\' NOT FOUND";
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

