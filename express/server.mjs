
import express from 'express';
import fs from "fs";

import {} from './lib.js';  // globalThis.rpc_cmd = function rpc_cmd(){}

const server = express();
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser
//server.use( express.urlencoded( { extended: true } ) ); // for ??

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

function get_query_report( request )	{

	return( {
		method: request.method,
		url: request.url, // unparsed
		path: request.path,
		params: request.params,
		query: request.query,
		count: get_and_increment_data_count( "data.json" )
	} );
}

function get_api_response( request, response )	{

	let report = get_query_report( request );

	console.log( report );
	response.send( report );
}
server.get( '/api', get_api_response );
server.get( '/api/:arg', get_api_response );
server.get( '/api/:arg1/:arg2', get_api_response );
server.get( '/api/:a1/:a2/:a3', get_api_response );
server.get( '/api/:a1/:a2/:a3/:a4', get_api_response );

function post_test_handler( request, response )	{

	let output = {
		report: get_query_report( request ),
		input: request.body,
		result: { test: "OK" }
	};

	console.log( output );
	response.send( output );
}
server.post( '/test', post_test_handler );
server.post( '/test/:arg', post_test_handler );
server.post( '/test/:arg1/:arg2', post_test_handler );

server.post(
	'/RPC',
	( request, response ) => {

		let output = {
			report: get_query_report( request ),
			input: request.body
		};

		if( typeof globalThis[ request.body.rpc ] === "function" )	{
			output.result = globalThis[ request.body.rpc ]( request.body ); // from lib.js
		}
		else	{
			let msg = "RPC: function \'" + request.body.rpc + "\' NOT FOUND";
			output.result = { error: msg };
		}

		console.log( output );
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

