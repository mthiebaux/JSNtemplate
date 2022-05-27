
// Express WebSocket Tunnel Console Server...

//const WebSocketServer = require('ws'); // 3.2 MB --> 3.3 MB : 0.132 MB added

// https://www.piesocket.com/blog/nodejs-websocket/
// https://flaviocopes.com/node-websockets/
// https://github.com/websockets/ws
// https://github.com/mhzed/wstunnel
// https://github.com/HenningM/express-ws

import fs from 'fs';

import * as http from 'http';
import * as https from 'https';


import express from 'express';

// NOTE:
//	There is no ws.Server in the ESM version, use import { WebSocketServer } from 'ws' instead.
//import WebSocket from 'ws';
//import { WebSocketServer } from 'ws';
//import WebSocket, { WebSocketServer } from 'ws';

import { WebSocket, WebSocketServer } from 'ws';

//////////////////////////////////////////////////////

const ssl_options = {
	key: fs.readFileSync( './ssl/key.pem', 'utf8' ),
	cert: fs.readFileSync( './ssl/cert.pem', 'utf8' )
};

/*
const options = {
   key: fs.readFileSync( __dirname + '/ssl/key.pem', 'utf8' ),
  cert: fs.readFileSync( __dirname + '/ssl/cert.pem', 'utf8' )
};

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem')
});
const wss = new WebSocket.Server({ server });
*/

const server = express();
server.use( express.static( '.' ) );
server.use( express.json() ); // needed for request.body parser

// Browsers try to request /favicon.ico to show an icon in the browser tab.
server.get( '/favicon.ico', ( req, res ) => res.status( 204 ).end() );


// Set up a headless websocket server
const wsserver = new WebSocketServer(
	{ noServer: true }
);

let port = 8080;

//////////////////////////////////////////////////////

wsserver.on(
	'connection',
	( socket, request ) => {

		console.log( "request.url: " + request.url );
		console.log( "request.method: " + request.method );

		socket.on(
			'message',
			( data ) => {

				let msg = data.toString(); // convert to String

				console.log( msg );

				socket.send( "Server received from Client: " + msg );
			}
		);

		socket.on( "close", () => {
			console.log( "Client has disconnected" );
		});

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
		console.log( " │   Upgrade Http Server:            │" );
		console.log( " │                                   │" );
		console.log( " │       http://localhost:" + port + "       │" );
		console.log( " │                                   │" );
		console.log( " │   WebSocket Server:               │" );
		console.log( " │                                   │" );
		console.log( " │       ws://localhost:" + port + "         │" );
		console.log( " │                                   │" );
		console.log( " └───────────────────────────────────┘" );
	}
);

listener.on(
	'upgrade',
	async function upgrade( request, socket, head ) {

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



