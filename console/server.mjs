
import express from 'express';

import requestID from 'express-request-id';

import * as readline from "readline";


const server = express();
server.use( requestID() );
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser

const reader = readline.createInterface(
	{
		input: process.stdin,
		output: process.stdout
	}
);

var client_list = [];
var poll_queue = [];

/////////////////////////////////////////////////////////

function exit_poll_requests()	{

	console.log( "poll: close" );

	let req = null;
	while( req = poll_queue.shift() )	{ // pop from front

		let output = {

			status: false,
			report: req.report,
			msg: "exit"
		};

		console.log( output );
		req.response.send( output );
	}
}

function process_line_input( input )	{

	if( input == "who" )	{
		for( let c of client_list )	{
			console.log( c );
		}
	}
	else
	if( input == "poll" )	{
		for( let p of poll_queue )	{
			console.log( p.report.body );
		}
	}
	else
	if( input == "push" )	{

		let req = null;
		while( req = poll_queue.shift() )	{ // pop from front

			let output = {

				status: true,
				report: req.report,
				msg: "push OK"
			};

			console.log( output );
			req.response.send( output ); // detect error, remove from client list?

		}
	}
	else	{

	}
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
	'/uuid',
	( request, response ) => {

		let output = {
			report: get_request_report( request ),
			client: {
				id: client_list.length,
				uuid: request.id  // from: express-request-id
			}
		};

		client_list.push( { id: output.client.id, uuid: output.client.uuid } );

//		console.log( output );
		response.send( output );
	}
);

server.post(
	'/poll',
	( request, response ) => {

		if( request.body.uuid )	{

			let report = get_request_report( request );
//			console.log( report );

			let poll_req = {
				report: report,
				response: response
			}
			poll_queue.push( poll_req ); // push to back
		}
		else	{

			let output = {
				report: get_request_report( request ),
				error: "poll: client UUID NOT FOUND"
			};

			console.log( output );
			response.send( output );
		}
	}
);

server.get(
	'/who',
	( request, response ) => {

// console.log( request.body ); // NOT null !!

		let client_ids = [];
		for( let c of client_list )	{
			client_ids.push( c.id );
		}

		let output = {
			report: get_request_report( request ),
			clients: client_ids
		};

//		console.log( output );
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

		exit_poll_requests();

		reader.close();
		listener.close();
	}
);

