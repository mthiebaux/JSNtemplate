
import { /* globalThis.rpc_process_command */ } from './lib.js';

import { createRequire } from 'module';
const require = createRequire( import.meta.url );

const http = require( "http" );
const fs = require( "fs" );
const path = require( "path" );
const url = require('url');

const port = 8080;

let api_count  = 0;

/////////////////////////////////////////////////////////

const server = http.createServer( server_callback );

function server_callback( request, response )	{

	// https://www.geeksforgeeks.org/node-js-url-parseurlstring-parsequerystring-slashesdenotehost-api/
	let parseQueryString = true;
	let slashesDenoteHost = true;
	let parsed_url = url.parse( request.url, parseQueryString, slashesDenoteHost );
//	console.log( parsed_url );

	console.log( request.method + ": " + parsed_url.pathname + ": " + JSON.stringify( parsed_url.query ) );

	if( request.method === "GET" )	{

		if( parsed_url.pathname === "/api" )	{

			api_count++;

			// use route and/or query params from parsed_url

			response.write( JSON.stringify( { msg: "GET api", count: api_count } ) );


		}
		else	{

			let url = ".";
			if( parsed_url.pathname === "/" )	{
				url += "/index.html"; // default
			}
			else	{
				url += parsed_url.pathname;
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

				let msg = "GET: " + parsed_url.pathname + " NOT FOUND";
				response.write( JSON.stringify( { error: msg } ) );
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
					url: request.url, // unparsed
					input: input_obj
				};

				if( parsed_url.pathname === "/test" )	{

					output.result = { test: "OK" };
				}
				else
				if( parsed_url.pathname === "/RPC" )	{

					if( typeof globalThis[ input_obj.rpc ] === "function" )	{

						output.result = globalThis[ input_obj.rpc ]( input_obj ); // from lib.js
					}
					else	{
						let msg = "RPC: " + input_obj.rpc + " NOT FOUND";
						output.result = { error: msg };
					}
				}
				else	{

					let msg = "POST: " + parsed_url.pathname + " NOT FOUND";
					output.result = { error: msg };
				}

				response.write(
					JSON.stringify( output )
				);
				response.end();
			}
		)
	}
}

/////////////////////////////////////////////////////////

server.listen(
	port,
	() => {
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Vanilla Module Server:          │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );
	}
);

