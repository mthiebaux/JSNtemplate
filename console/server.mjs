
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
	while( req = poll_queue.pop() )	{

		let output = {

			status: false,
			report: req.report,
			msg: "EXIT"
		};

		console.log( output );
		req.response.send( output );
	}
}

function forward_payload( payload )	{

	// parse content to array + text string: done by client

	let skip_queue = [];

	let poll_req = null;
	while( poll_req = poll_queue.shift() )	{

		if( payload.to.includes( poll_req.report.body.id ) )	{

			let output = {
				status: true,
				report: "forward payload",
				payload: payload
			};

			console.log( output );
			poll_req.response.send( output );
		}
		else	{

			skip_queue.push( poll_req );
		}
	}
	poll_queue = skip_queue;
}

function process_line_input( input )	{

	if( input == "who" || input == "clients" )	{

//		console.log( "clients:" );
		for( let c of client_list )	{
			console.log( c );
		}
/*
		console.log( "current:" );
		for( let p of poll_queue )	{
			console.log( p.report.body );
		}
*/
	}
	else
	if( input == "poll" || input == "current" )	{
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
			req.response.send( output );
		}
	}
	else	{
		console.log( "process_line_input ERR: uncaught input key: " + input );
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

function check_existing_id( Q, id, uuid )	{

	// alert mismatched id/uuid IMPOSTOR! in client_list, poll_queue
	for( let c of Q )	{

		if( id === c.id )	{
			if( uuid === c.uuid )	{
				return( true );
			}
			console.log( "check_existing_id UUID IMPOSTOR: " + id );
			console.log( " current: " + c.uuid );
			console.log( " request: " + uuid );
			return( false );
		}
		else
		if( uuid === c.uuid )	{
			console.log( "check_existing_id ID IMPOSTOR: " + uuid );
			console.log( " current: " + c.id );
			console.log( " request: " + id );
			return( false );
		}
	}
	console.log( "check_existing_id ERR: NOT FOUND" );
	console.log( " request: " + id + " : " + uuid );
	return( false );
}

function check_and_store_poll_request( long_poll_req )	{

	let id = long_poll_req.report.body.id;
	let uuid = long_poll_req.report.body.uuid;

	if( check_existing_id( client_list, id, uuid ) )	{

		for( let i=0; i< poll_queue.length; i++ )	{

			if( poll_queue[ i ].report.body.id === id )	{

				console.log( "poll REPLACE: " + id + " : " + uuid );

				poll_queue[ i ] = long_poll_req; // replace existing long poll entry
				return;
			}
		}
		poll_queue.push( long_poll_req ); // push to back
	}
	else	{

		console.log( "check_and_store_poll_request ID ERR" );
	}
}

function check_and_send_body_payload( body )	{

	console.log( body );

	if( check_existing_id( client_list, body.id, body.uuid ) )	{

		let sanitary_payload = {

			from: body.id,
			to: body.to,
			text: body.text
		}

		forward_payload( sanitary_payload );
	}
	else	{

		console.log( "check_and_send_body_payload ID ERR" );
	}
}

/////////////////////////////////////////////////////////

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
		console.log( "REGISTER CLIENT:" );
		console.log( output );

		response.send( output );
	}
);

server.post(
	'/poll',
	( request, response ) => {

		let report = build_request_report( request );

		if( request.body.uuid )	{

			let long_poll_req = {
				report: report,
				response: response
			}

		// check for pre-existing id/uuid and replace
			check_and_store_poll_request( long_poll_req );

//			poll_queue.push( long_poll_req ); // push to back, send later
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

			// forward_payload( request.body );

			check_and_send_body_payload( request.body );

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

let tunnel_config = {
	port: port
};
if( process.argv.length > 3 )	{
	tunnel_config.subdomain = process.argv[ 3 ];
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
	tunnel_config,
	( err, tunnel ) => {

		console.log( "" );
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Tunnel Server:                  │" );
		console.log( " │                                   │" );
		console.log( " │       " + tunnel.url + "    │" );
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

		setTimeout( () => {

			listener.close();

			tunneller.close();

			reader.close();

		}, 1000 );

	}
);

