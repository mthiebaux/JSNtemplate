
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

//////////////////////////////////////////////////////

let connect_arr = [];

function add_connection( in_socket )	{

	function pseudo_uid( id )	{
		const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		return( alpha[ id ] + "-" + id + id + "-" + ( id + id ) );
	}

	let c = connect_arr.length;
	let conn_obj = {
		client: {
			id: c,
			uid: pseudo_uid( c ),
			uuid: ""
		},
		socket: in_socket
	}
	connect_arr.push( conn_obj );

	return( conn_obj );
}

function print_connections()	{

	console.log( "connections:" );
	for( let cn of connect_arr )	{
		console.log( cn.client );
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
	'/connect',
	( request, response ) => {

		console.log( "CONNECT:" );

		let report = build_request_report( request );
		console.log( report );

		let output = {
			report: report,
			portal: {
				wsurl: "ws://localhost:" + port,
				wstunnel: ws_tunnel,
				wss: wss_tunnel
			},
			uuid: request.id  // from: express-request-id
		};
		console.log( "INVITE CLIENT TO PORTAL:" );
		console.log( output.portal );

		response.send( output );
	}
);

//////////////////////////////////////////////////////

wsserver.on(
	"connection",
	( socket, request ) => {

		console.log( "WS-CONNECTION:" );
		console.log( " request.url: " + request.url );
		console.log( " request.method: " + request.method );

		let conn = add_connection( socket );

		let registration = {
			token: "registration",
			client: conn.client
		}
		socket.send( JSON.stringify( registration ) );

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

		console.log( "Client registered:" );
		console.log( conn.client );

		print_connections();


		socket.on(
			"message",
			( buffer ) => {

				let data_str = buffer.toString();
				let data_obj = JSON.parse( data_str );

				if( data_obj.token )	{

					let tok = data_obj.token;

					if( tok === "ALIVE" )	{

						console.log( data_obj );
					}
					else
					if( tok === "alive" )	{

						console.log( "alive: " + data_obj.client.id );
					}
					else
					if( tok === "poke" )	{

						// broadcast to client Set:
						wsserver.clients.forEach(
							function( client ) {
				//		  		if (client !== socket && client.readyState === WebSocket.OPEN) {
								if( client.readyState === WebSocket.OPEN ) {

									let push = {
										token: "push"
									}
									let payload_str = JSON.stringify( push );

									client.send( payload_str );
								}
							}
						);

					}
					else
					if( tok === "who" )	{

						let id_arr = [];
						for( let cn of connect_arr )	{
							id_arr.push( cn.client.id );
						}

						let clients = {
							token: "clients",
							clients: id_arr
						}
						let payload_str = JSON.stringify( clients );

						socket.send( payload_str );

					}
					else
					if( tok === "POKED" )	{

					}
					else	{

						console.log( "unhandled token: " + tok );
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

let tunnel_config = {
	port: port
};


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
		console.log( " │       " + tunnel.url );
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
	}
);

