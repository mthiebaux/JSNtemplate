
import express from 'express';

import requestID from 'express-request-id'; // NOTE: npm install express-request-id

import * as readline from "readline";


const server = express();
server.use( requestID() );

const reader = readline.createInterface(
	{
		input: process.stdin,
		output: process.stdout
	}
);

/////////////////////////////////////////////////////////

function process_line_input( input )	{

	console.log( "input: " + input );
}

/*
function console_loop()	{

	let count = 0;
	function prompt()	{
		reader.setPrompt( `[${ count }]> ` );
		reader.prompt();
		count++;
	}

	reader.on(
		"line",
		( input_buffer ) =>	{

			let input = input_buffer.trim();
			if( input == "q" )	{

				process.kill( process.pid, "SIGTERM" );
			}
			else
			if( input == "Q" )	{

				process.exit(); // force quit
			}
			else	{
				if( input.length )	{
					process_line_input( input );
				}
				prompt();
			}
		}
	);

	console.log( "Enter 'q' to exit, or 'Q' to force quit" );
	prompt();
}
*/

function console_loop()	{

	let count = 0;
	function prompt()	{
		reader.question( `[${ count }]> `, prompt_handler );
		count++;
	}

	function prompt_handler( input_buffer )	{

		let input = input_buffer.trim();
		if( input == "q" )	{

			process.kill( process.pid, "SIGTERM" );
		}
		else
		if( input == "Q" )	{

			process.exit(); // force quit
		}
		else	{
			if( input.length )	{
				process_line_input( input );
			}
			prompt();
		}
	}

	console.log( "Enter 'q' to exit, or 'Q' to force quit" );
	prompt();
}

/////////////////////////////////////////////////////////

function get_request_report( request )	{

	return( {
		method: request.method,
		url: request.url, // unparsed
		path: request.path,
		params: request.params,
		query: request.query,
		body: request.body ? request.body : null,
		count: 0
	} );
}

server.get(
	'/',
	( request, response ) => {

		let output = {
			report: get_request_report( request )
		};

		console.log( output );
		response.send( output );
	}
);

server.get(
	'/uuid',
	( request, response ) => {

		let output = {
			report: get_request_report( request ),
			uuid: request.id  // from: express-request-id
		};

		console.log( output );
		response.send( output );
	}
);

/////////////////////////////////////////////////////////

let port = 8080;

function get_port_input_value()	{

	if( process.argv.length > 2 )	{
		port = process.argv[ 2 ];
	}
	return( port );
}

let listener = server.listen(
	get_port_input_value(),
	() => {

		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Express Server:                 │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

		console_loop();
	}
);

reader.on(
	"close",
	() => {
		console.log( "interface: close" );
	}
);

listener.on(
	"close",
	() => {
		console.log( "listener: close" );
	}
);

process.on(
	"SIGTERM",
	() => {
		console.log( "process: SIGTERM" );

		reader.close();
		listener.close();
	}
);

