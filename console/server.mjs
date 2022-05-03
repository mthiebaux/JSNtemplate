
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

/*
// if in 'to:' list...
		console.log( "HERE:" );
//		console.log( poll_req.report );
		console.log( poll_req.report.body );
		console.log( poll_req.report.body.id );

		console.log( payload );
		console.log( payload.to );
*/

/*
		let output = {
			status: true,
			report: poll_req.report,
			payload: payload
		};
*/
		let output = {
			status: true,
			report: "forward <x>"
		};
		if( payload.to.includes( poll_req.report.body.id ) )	{

			output.payload = payload;
		}
		else	{
			output.payload = "<stub>";

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
		let output = {
			report: build_request_report( request ),
			clients: client_ids
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
/*
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function garbage_string_to_num_arr( S )	{

	let to_arr = [];
	let brk = S.indexOf( ":" );

	console.log( "--" );
	if( brk !== -1 )	{

		let prefix = S.slice( 0, brk );

		to_arr = prefix.split( ',' ).join( ' ' ).split( ' ' ).filter(
			s => { let t = s.trim(); return( t.length ); }	// strip out any ''
		).map(
			s => Number( s )
		).filter(
			n => isNumeric( n )
		);
		console.log( to_arr );

		const unique = [ ...new Set( to_arr ) ];
		console.log( unique );

		console.log( S.slice( brk + 1 ) );
	}
	else	{
		console.log( "bounce:" + S );
	}
	console.log( "-" );
	return( to_arr );
}

function test_code()	{

	garbage_string_to_num_arr( "" );
	garbage_string_to_num_arr( "0" );
	garbage_string_to_num_arr( ":" );
	garbage_string_to_num_arr( "0:" );
	garbage_string_to_num_arr( ":0" );


	garbage_string_to_num_arr( " 1 2 3 : " );
	garbage_string_to_num_arr( " a b c : " );

	garbage_string_to_num_arr( " 0 a 1 b 2 c : - 34" );
	garbage_string_to_num_arr( " 2 a 1 b 2 c 3 : - 35 ^" );
}
*/

/////////////////////////////////////////////////////////

let port = 8080;

function get_port_arg_value()	{

	if( process.argv.length > 2 )	{
		port = process.argv[ 2 ];
	}
	return( port );
}

let listener = server.listen(
	get_port_arg_value(),
	() => {

		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Express Server:                 │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

//		test_code();

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

