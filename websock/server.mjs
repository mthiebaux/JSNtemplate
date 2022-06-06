
import express from 'express';
import requestID from 'express-request-id';
import localtunnel from 'localtunnel';
import * as readline from "readline";

import { WebSocket, WebSocketServer } from 'ws';

//////////////////////////////////////////////////////

const server = express();
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser
server.use( requestID() );

// Browsers try to request /favicon.ico to show an icon in the browser tab.
server.get( '/favicon.ico', ( req, res ) => res.status( 204 ).end() );

const wsserver = new WebSocketServer(
	{ noServer: true } // express server upgrade routing to ws
);

//////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////

let reg_list = [];

function print_clients()	{

	console.log( "registered clients:" );
	for( let r of reg_list )	{
		console.log( r.client );
	}
	console.log( "connected clients:" );
	for( let r of reg_list )	{
		if( r.socket !== null ) {
			if( r.socket.readyState === WebSocket.OPEN ) {
				console.log( r.client );
			}
		}
	}
}

//////////////////////////////////////////////////////

function build_request_report( request )	{

	return( {
		method: request.method,
		url: request.url,
		path: request.path,
		params: request.params,
		query: request.query,
		body: request.body ? request.body : null
	} );
}

server.get(
	'/register',
	( request, response ) => {

		let c = reg_list.length;
		let client_obj = {
			id: c,
			uuid: request.id // from: express-request-id
		};

		let register_obj = {
			client: client_obj,
			socket: null,
			ival_id: null
		}
		reg_list.push( register_obj );

		let output = {
			report: build_request_report( request ),
			client: client_obj
		};
		console.log( "REGISTER CLIENT:" );
		console.log( output );

		response.send( output );
	}
);

//////////////////////////////////////////////////////

function process_message_token( socket, data_obj )	{

	let tok = data_obj.token;

	if( tok === "REGISTER" )	{ // client has uuid

		// check UUID, destroy pre-existing or block mismatched registration ?

		if( ( data_obj.client.id >= 0 )&&( data_obj.client.id < reg_list.length ) )	{

			if( data_obj.client.uuid === reg_list[ data_obj.client.id ].client.uuid )	{

				if( reg_list[ data_obj.client.id ].ival_id  !== null )	{

					clearInterval( reg_list[ data_obj.client.id ].ival_id );
				}
				if( reg_list[ data_obj.client.id ].socket !== null ) {

		//			reg_list[ data_obj.client.id ].socket.close();
					reg_list[ data_obj.client.id ].socket.terminate();
				}
				reg_list[ data_obj.client.id ].socket = socket;

				if( 1 ) {
					let HEARTBEAT = 30000; // 30 second sustain connection before 60 sec timeout

					reg_list[ data_obj.client.id ].ival_id = setInterval( () =>	{

						let poke = {
							token: "POKE"
						};
						socket.send( JSON.stringify( poke ) );

					}, HEARTBEAT );
				}
			}
			else	{
				// uuid not matched
				console.log( "REGISTER ERR: mismatched UUID" );
				console.log( data_obj.client );
			}
		}
		else	{
			// id out of bounds
			console.log( "REGISTER ERR: ID out of bounds" );
			console.log( data_obj.client );
		}

	}
	else
	if( tok === "PING" )	{ // client initiated
		// not sufficient to sustain connection
		// used to auto-reconnect with server restart

		console.log( data_obj );
		socket.send( JSON.stringify( { token: "PONG" } ) );
	}
	else
	if( tok === "ALIVE" )	{ // client responds to server POKE
		// sustaining connection

		console.log( data_obj );
	}
	else
	if( tok === "poke" )	{ // broadcast poke to all peers

		// broadcast to client Set:
		let bcast = {
			token: "poke"
		};
		for( let r of reg_list )	{
		//	if( r.socket !== socket ) // send to self ?
			if( r.socket !== null ) {
				if( r.socket.readyState === WebSocket.OPEN ) {
					r.socket.send( JSON.stringify( bcast ) );
				}
			}
		}
	}
	else
	if( tok === "who" )	{

		let id_arr = [];
		for( let r of reg_list )	{
			if( r.socket !== null ) {
				if( r.socket.readyState === WebSocket.OPEN ) {
					id_arr.push( r.client.id );
				}
			}
		}
		let clients = {
			token: "clients",
			payload: id_arr
		}
		socket.send( JSON.stringify( clients ) );

	}
	else
	if( tok === "send" )	{

		let message = {
			token: "message",
			from: data_obj.client.id,
			to: data_obj.to,
			payload: data_obj.payload
		}
		for( let r of reg_list )	{

			if( data_obj.to.includes( r.client.id ) )	{

				if( r.socket !== null ) {
					if( r.socket.readyState === WebSocket.OPEN ) {
						r.socket.send( JSON.stringify( message ) );
					}
				}
			}
		}

	}
	else	{

		console.log( "broadcast message token:" );
		console.log( data_obj );

		let bcast = {
			token: tok,
			payload: data_obj.payload
		};
		for( let r of reg_list )	{
			if( r.socket !== null ) {
				if( r.socket.readyState === WebSocket.OPEN ) {
					r.socket.send( JSON.stringify( bcast ) );
				}
			}
		}
	}
}

wsserver.on(
	"connection",
	( socket, request ) => {

		console.log( "WEBSOCK CONNECT:" );
		console.log( " request.method: " + request.method );
		console.log( " request.url: " + request.url );

		socket.on(
			"message",
			( buffer ) => {

				let data_str = buffer.toString();
				let data_obj = JSON.parse( data_str );

				if( data_obj.token )	{

					process_message_token( socket, data_obj );
				}
				else	{

					console.log( "unhandled message:" );
					console.log( data_obj );
				}
			}
		);

		socket.on(
			"close",
			( code, reason ) => {

				console.log( "WEBSOCK DISCONNECT:" );

				// identify which client id...
				for( let r of reg_list )	{
					if( r.socket === socket	)	{

						console.log( "  client: " + JSON.stringify( r.client ) );

						clearInterval( r.ival_id );
						r.ival_id = null;
						r.socket = null;
					}
				}
				console.log( "  code: " + code );
				console.log( "  reason: " + reason );
			}
		);

		socket.onerror = function ( err ) {
			console.log( "Some Error occurred: " + err );
		};
	}
);

//////////////////////////////////////////////////////

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

				if( input == "who" || input == "clients" )	{

					print_clients();
				}
				else
				if( input == "push" )	{

					for( let r of reg_list )	{
						if( r.socket !== null ) {
							if( r.socket.readyState === WebSocket.OPEN ) {

//								console.log( "push: " + r.client.id );

								r.socket.send( JSON.stringify( { token: "push" } ) );
							}
						}
					}
				}
				else	{
					console.log( "prompt_handler ERR: uncaught input key: " + input );
				}
			}
			prompt();
		}
	}

	console.log( "Enter 'q' to exit, or 'Q' to force quit" );
	prompt();
}

//////////////////////////////////////////////////////

const reader = readline.createInterface(
	{
		input: process.stdin,
		output: process.stdout
	}
);

reader.on(
	"close",
	() => {
		console.log( "reader: close" );
	}
);

let listener = server.listen(
	port,
	() => {

		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   WebSock Http Server:            │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

//		console_loop(); // moved to tunnel start
	}
);

listener.on(
	'upgrade',
	async function upgrade( request, socket, head ) {

		// check for credentials ?

		wsserver.handleUpgrade(
			request,
			socket,
			head,
			function forward( socket ) {

				wsserver.emit( 'connection', socket, request );
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

let tunneller = localtunnel(
	tunnel_config,
	( err, tunnel ) => {

		if( err )	{

			console.log( "localtunnel ERR:" );
			console.log( JSON.stringify( err ) );
			return;
		}

		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Tunnel Server:                  │" );
		console.log( " │                                   │" );
		console.log( " │       " + tunnel.url.replace( "https", "http" ) ); // until SSL certs are working
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

/*
		tunnel.on(
			'request',
			( info ) => {
				console.log( "localtunnel request: " + JSON.stringify( info, null, 2 ) );
			}
		);
*/
		tunnel.on(
			'error',
			( err ) => {
				console.log( "localtunnel error: " + JSON.stringify( err, null, 2 ) );
			}
		);
		tunnel.on(
			'close',
			() => {
				console.log( "localtunnel: close" );
			}
		);

		console_loop();
	}
);

process.on(
	"SIGTERM",
	() => {
		console.log( "process: SIGTERM" );

		for( let r of reg_list )	{
			if( r.socket !== null ) {
				if( r.socket.readyState === WebSocket.OPEN ) {

	// This will disable client auto-reconnect
//					r.socket.send( JSON.stringify( { token: "close" } ) );

					if( r.ival_id  !== null )	{
						clearInterval( r.ival_id );
						r.ival_id = null;
					}
					r.socket.close();		// graceful
					r.socket.terminate();
					r.socket = null
				}
			}
		}

		setTimeout( () => {

			listener.close();

			tunneller.close();

			reader.close();

		}, 1000 );

	}
);


