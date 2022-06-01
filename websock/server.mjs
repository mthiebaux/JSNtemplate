
import express from 'express';
import requestID from 'express-request-id';
import localtunnel from 'localtunnel';

import { WebSocket, WebSocketServer } from 'ws';

//////////////////////////////////////////////////////


const server = express();
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser
server.use( requestID() );

// Browsers try to request /favicon.ico to show an icon in the browser tab.
server.get( '/favicon.ico', ( req, res ) => res.status( 204 ).end() );

const wsserver = new WebSocketServer(
	{ noServer: true }
);

let port = 8080;
let ws_tunnel = "";
let wss_tunnel = "";

let tunnel_config = {
	port: port
};

//////////////////////////////////////////////////////

let reg_list = [];

function print_clients()	{

	console.log( "registered clients:" );
	for( let r of reg_list )	{
		console.log( r.client );
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
			socket: null
		}
		reg_list.push( register_obj );


		let output = {
			report: build_request_report( request ),
			portal: {
				local: "ws://localhost:" + port,
				tunnel: ws_tunnel,
				secure: wss_tunnel  // not supported
			},
			client: client_obj
		};
		console.log( "REGISTER CLIENT:" );
		console.log( output );

		response.send( output );
	}
);

//////////////////////////////////////////////////////

wsserver.on(
	"connection",
	( socket, request ) => {

		console.log( "WEBSOCK CONNECTION:" );
		console.log( " request.method: " + request.method );
		console.log( " request.url: " + request.url );

		if( 1 ) {
			let poke = {
				token: "POKE"
			}
			let payload_str = JSON.stringify( poke );

			let HEARTBEAT = 30000; // 30 second sustain connection
			setInterval( () =>	{

				socket.send( payload_str );

			}, HEARTBEAT );
		}

		print_clients();

		socket.on(
			"message",
			( buffer ) => {

				let data_str = buffer.toString();
				let data_obj = JSON.parse( data_str );

				if( data_obj.token )	{

					let tok = data_obj.token;

					if( tok === "REGISTER" )	{ // client has uuid

						if( reg_list[ data_obj.client.id ].socket !== null ) {
							// check UUID, destroy

						}
						reg_list[ data_obj.client.id ].socket = socket;

					}
					else
					if( tok === "PING" )	{ // client initiated
						// not sufficient to sustain connection
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
if( 1 )	{
						for( let r of reg_list )	{
						//	if( r.socket !== socket ) // sender to self ?
							if( r.socket.readyState === WebSocket.OPEN ) {
								r.socket.send( JSON.stringify( bcast ) );
							}
						}
} else	{
						wsserver.clients.forEach(
							function( client ) {

				//		  		if (client !== socket && client.readyState === WebSocket.OPEN) {
								if( client.readyState === WebSocket.OPEN ) {
									client.send( JSON.stringify( bcast ) );
								}
							}
						);
}

					}
					else
					if( tok === "alive" )	{ // broadcast respondses to all poke

						let bcast = {
							token: "alive",
							id: data_obj.client.id
						};
						for( let r of reg_list )	{
							if( r.socket.readyState === WebSocket.OPEN ) {
								r.socket.send( JSON.stringify( bcast ) );
							}
						}
					}
					else
					if( tok === "who" )	{

						let id_arr = [];
						for( let r of reg_list )	{
							id_arr.push( r.client.id );
						}

						let clients = {
							token: "clients",
							clients: id_arr
						}
						socket.send( JSON.stringify( clients ) );

					}
					else	{

						console.log( "unhandled message token:" );
						console.log( data_obj );
					}

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
				console.log( "Client has disconnected" );
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

let tunneller = localtunnel(
	tunnel_config,
	( err, tunnel ) => {

		ws_tunnel = tunnel.url.replace( "https", "ws" );
//		ws_tunnel = tunnel.url.replace( "http", "ws" );
//		wss_tunnel = tunnel.url.replace( "https", "wss" );

		console.log( "" );
		console.log( " ┌───────────────────────────────────┐" );
		console.log( " │                                   │" );
		console.log( " │   Tunnel Server:                  │" );
		console.log( " │                                   │" );
		console.log( " │       " + tunnel.url.replace( "https", "http" ) );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );

///*
		tunnel.on(
			'request',
			( info ) => {
				console.log( "localtunnel request: " + JSON.stringify( info, null, 2 ) );
			}
		);
//*/
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
	}
);

