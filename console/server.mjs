
import express from 'express';

import requestID from 'express-request-id';

import * as readline from "readline";

import localtunnel from 'localtunnel';

/////////////////////////////////////////////////////////

const server = express();
server.use( requestID() );
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser

var client_list = [];
var poll_queue = [];

/////////////////////////////////////////////////////////

function exit_poll_requests()	{

	console.log( "exit_poll_requests" );

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

function forward_payload( payload )	{

	// parse content to array + text string: done by client
	console.log( "forward_payload" );

	let poll_req = null;
	while( poll_req = poll_queue.shift() )	{ // pop all polls from front

		let output = {
			status: true,
			report: "forward <x>"
		};
		if( payload.to.includes( poll_req.report.body.id ) )	{

			output.payload = payload;
		}
		else	{
			output.payload = "forward token";

			// or re-push to poll_queue ?? No, must reshuffle
		}

//		console.log( output );
		poll_req.response.send( output );

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
				payload: "push token"
			};

//			console.log( output );
			req.response.send( output ); // detect error, remove from client list?
		}
	}
	else	{
		console.log( "ERR process_line_input: uncaught input key: " + input );
	}
}

/////////////////////////////////////////////////////////

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
/////////////////////////////////////////////////////////

function build_request_report( request )	{

	return( {
		method: request.method,
		url: request.url, // unparsed
		path: request.path,
		params: request.params,
		query: request.query,
		body: request.body ? request.body : null
	} );
}

server.get(
	'/uuid',
	( request, response ) => {

		let client = {
			id: client_list.length,
			uuid: request.id  // from: express-request-id
		};
		client_list.push( client );

		let output = {
			report: build_request_report( request ),
			client: client
		};
		console.log( "REGISTER:" );
		console.log( output );

		response.send( output );
	}
);

server.post(
	'/poll',
	( request, response ) => {

		let report = build_request_report( request );
		if( request.body.uuid )	{ // check against known uuid list??

			let long_poll_req = {
				report: report,
				response: response
			}
			poll_queue.push( long_poll_req ); // push to back, send later
		}
		else	{
			let output = {
				report: report,
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

		// console.log( request.body ); // GET body NOT null !!
//		request.body.huh = "GET request.body NOT null !!";

		let client_ids = [];
		for( let c of client_list )	{
			client_ids.push( c.id );
		}
		let polling_ids = [];
		for( let p of poll_queue )	{
			polling_ids.push( p.report.body.id );
		}
		let output = {
			report: build_request_report( request ),
			clients: client_ids,
			current: polling_ids
		};
//		console.log( output );
		response.send( output );
	}
);

server.post(
	'/send', // send to all pollers
	( request, response ) => {

		let output = {
			report: build_request_report( request )
		};
		if( request.body )	{

			forward_payload( request.body );

			output.msg = "forwarded";
		}
		else	{
			output.error = "send: request.body NOT FOUND";
		}
//		console.log( output );
		response.send( output );
	}
);

/////////////////////////////////////////////////////////

const reader = readline.createInterface(
	{
		input: process.stdin,
		output: process.stdout
	}
);

let port = 8080;
if( process.argv.length > 2 )	{
	port = process.argv[ 2 ];
}

let subd = "mthiebaux";
if( process.argv.length > 3 )	{
	subd = process.argv[ 3 ];
}

let listener = server.listen(
	port,
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

let tunneller = localtunnel(
	{
		port: port,
		subdomain: subd
	},
	( err, tunnel ) => {

		console.log( "" );
		console.log( "port: " + port );
		console.log( "subd: " + subd );
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Tunnnel Server:                 │" );
		console.log( " │                                   │" );
		console.log( " │       " + tunnel.url + "   │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

		tunnel.on(
			'close',
			() => {
				console.log( "localtunnel: close" );
			}
		);
	}
);

listener.on(
	"close",
	() => {
		console.log( "listener: close" );
	}
);

reader.on(
	"close",
	() => {
		console.log( "reader: close" );
	}
);

process.on(
	"SIGTERM",
	() => {
		console.log( "process: SIGTERM" );

		exit_poll_requests();

		listener.close();

		tunneller.close();

		reader.close();

	}
);

