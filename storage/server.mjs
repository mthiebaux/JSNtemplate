
import fs from "fs";
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

const profiles_filename = "profiles.json";

let client_connections = {};

// IIFE for automatic storage loading
( function load_profiles()	{

	try	{
		let profiles = JSON.parse( fs.readFileSync( profiles_filename ) );
		for( let name in profiles )	{

			let conn_obj = {
				profile: profiles[ name ],
				socket: null
			};
			client_connections[ name ] = conn_obj;
		}
	} catch( err )	{

		if( err.code === 'ENOENT' ) { // no such file or directory

			client_connections = {}; // scratch

		} else {
		  throw err;
		}
	}
} )();

function save_profiles()	{

	let profiles = {};
	for( let name in client_connections )	{

		profiles[ name ] = client_connections[ name ].profile;
	}

	fs.writeFileSync(
		profiles_filename,
		JSON.stringify( profiles, null, 4 ),
		(err) => {
			if (err) console.log( err );
		}
	);
}

function update_profile( name, password, uuid )	{

	if( client_connections[ name ] )	{

		if( client_connections[ name ].profile.password !== password )	{

			console.log( "ERR: password incorrect" );
			return( false );
		}
	}
	else	{

		client_connections[ name ] = {

			profile: {
				password: password,
				registration: ""
			}
		};
	}

	client_connections[ name ].profile.registration = uuid;

	save_profiles();
	return( true );
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

server.post(
	'/register',
	( request, response ) => {

		let uuid = request.id; // registration key

		let output = {
			report: build_request_report( request )
		};
		console.log( "register request:" );
		console.log( request.body );

		if( update_profile( request.body.name, request.body.password, uuid ) )	{

			output.result = {
				msg: "registered",
				registration: uuid
			}
		}
		else	{
			output.result = {
				msg: "registration failed"
			}
		}

//		console.log( output );
		response.send( output );
	}
);

//////////////////////////////////////////////////////

function process_message_token( socket, data_obj )	{

	// check registration first

	// if( data_obj.client ) { if( data_obj.client.name ) { } }

	let client = client_connections[ data_obj.client.name ];
	if( client )	{
		if( data_obj.client.registration !== client.profile.registration )	{

			socket.send( JSON.stringify( { token: "ERROR", msg: "stale registration" } ) );
			return;
		}
	}
	else	{
		socket.send(
			JSON.stringify( {
				token: "ERROR",
				msg: "name \'" + data_obj.client.name + "\' not found"
			} )
		);
		return;
	}

	let tok = data_obj.token;

	if( tok === "connect" )	{

		console.log( data_obj );

		if( client.socket )	{
			if( client.socket.readyState === WebSocket.OPEN ) {

				client.socket.send(
					JSON.stringify( {
						token: "DISCONNECT",
						msg: "logged in elsewhere"
					} )
				);
				client.socket.close();		// graceful
				client.socket.terminate();
				client.socket = null
			}
		}
		client.socket = socket;

		socket.send(
			JSON.stringify(
				{
					token: "CONNECT",
					msg: "HELLO from server"
				}
			)
		);
	}
	else
	if( tok === "who" )	{

		let id_arr = [];
		for( let name in client_connections )	{
			id_arr.push( name );
		}
		let client_arr_obj = {
			token: "CLIENTS",
			payload: id_arr
		}
		socket.send( JSON.stringify( client_arr_obj ) );

		let forward_obj = {
			token: "recv",
			from: data_obj.client.name,
			payload: {
				token: "poke"
			}
		};
		let forward_str = JSON.stringify( forward_obj );

		for( let name in client_connections )	{ // from process.on( "SIGTERM"...

			let socket = client_connections[ name ].socket;
			if( socket )	{
				if( socket.readyState === WebSocket.OPEN ) {

					socket.send( forward_str );
				}
			}
		}
	}
	else
	if( tok === "send" )	{

//		console.log( data_obj );

		let forward_obj = {
			token: "recv",
			from: data_obj.client.name,
			payload: data_obj.payload
		};
		let forward_str = JSON.stringify( forward_obj );

		for( let name of data_obj.to )	{

			let client = client_connections[ name ];
			if( client )	{
				if( client.socket )	{
					if( client.socket.readyState === WebSocket.OPEN ) {

						client.socket.send( forward_str );
					}
				}
			}
		}

	}
	else
	if( tok === "PING" )	{ // client initiated
		// not sufficient to sustain connection
		// used to auto-reconnect with server restart

//		console.log( data_obj );
		socket.send( JSON.stringify( { token: "PONG" } ) );
	}

	else
	if( tok === "ALIVE" )	{ // client responds to server POKE
		// sustaining connection

//		console.log( data_obj );
	}
	else	{
		console.log( "unhandled token: " + tok );
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
		console.log( " │   Session Http Server:            │" );
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

/*
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
*/
		for( let name in client_connections )	{

			let socket = client_connections[ name ].socket;
			if( socket )	{
				if( socket.readyState === WebSocket.OPEN ) {
					socket.close();		// graceful
					socket.terminate();
					socket = null
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


