
import { /* globalThis.rpc_process_command */ } from './lib.js';

import express from 'express';
import fs from "fs";

const server = express();

let port = 8080;

/////////////////////////////////////////////////////////

function get_and_increment_data_count( filename )	{

	let data_obj = JSON.parse( fs.readFileSync( filename ) );
	if( data_obj.count !== undefined )	{
		data_obj.count++;
		fs.writeFileSync( filename, JSON.stringify( data_obj, null, 2 ), (err) => {
				if (err) console.log( err );
			}
		);
		return( data_obj.count );
	}
	return( -1 );
}

/////////////////////////////////////////////////////////

server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser
//server.use( express.urlencoded( { extended: true } ) ); // for ??


server.get(
	'/api',
	( request, response ) => {

		console.log( request.method + " : " + request.path + " : " + JSON.stringify( request.query ) );

		response.send( { msg: "GET api", count: get_and_increment_data_count( "data.json" ) } );
	}
);

server.get(
	'/api/:arg1/:arg2',
	( request, response ) => {

		console.log(
			request.method + " : " +
			request.path + " : " +
			JSON.stringify( request.query ) + " :",
			request.params
		);

		response.send( { msg: "GET api", count: get_and_increment_data_count( "data.json" ) } );
	}
);


server.post(
	'/test',
	( request, response ) => {

		console.log( request.method + " : " + request.path + " : " + JSON.stringify( request.query ) );

		let output = {
			url: request.url, // unparsed
			input: "empty",
			result: { test: "OK" }
		};

		response.send( output );
	}
);

server.post(
	'/RPC',
	( request, response ) => {

		console.log( request.method + " : " + request.path + " : " + JSON.stringify( request.query ) );

		let output = {
			url: request.url, // unparsed
			input: request.body
		};

		if( typeof globalThis[ request.body.rpc ] === "function" )	{

			output.result = globalThis[ request.body.rpc ]( request.body ); // from lib.js
		}
		else	{
			let msg = "RPC: " + request.body.rpc + " NOT FOUND";
			output.result = { error: msg };
		}

		response.send( output );
	}
);

/////////////////////////////////////////////////////////

function get_port_input_value()	{

	if( process.argv.length > 2 )	{
		port = process.argv[ 2 ];
	}
	return( port );
}

server.listen(
	get_port_input_value(),
	() => {
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Express Server:                 │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );
	}
);

