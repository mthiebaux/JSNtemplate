
export {
	app_init,
	poke_server,
	who_server
};

let client_page_index_id = "";
let client_poke_button_id = "";
let client_who_button_id = "";
let client_output_log_id = "";

let reg_info = {
	client: {
		id: -1,
		uuid: ""
	},
	socket: null
};

/*

Each client initiates WebSock registration by submitting 'GET /register' to the server using fetch().
The server responds with a new id and uuid, and a socket portal to connect.

Once the socket opens, the client begins exchanging socket messages using the token property for
message routing, beginning with 'REGISTER' plus its client identifiers, to complete the socket
registration process.

This two step process ensures that the socket connection handlers are mapped to the correct
client identifiers, to maintain two-way push communication and forwarding.

*/

/////////////////////////////////////////////////////////

function app_init( page_client_id, poke_button_id, who_button_id, output_log_id )	{

	client_page_index_id = page_client_id;
	client_poke_button_id = poke_button_id;
	client_who_button_id = who_button_id;
	client_output_log_id = output_log_id;

	fetch_get_request( "register", register_request_handler );
}

function who_server()	{

	if( reg_info.socket )	{

		let who = {
			token: "who",
			client: reg_info.client
		};
		reg_info.socket.send( JSON.stringify( who ) );
	}
}

function poke_server()	{

	if( reg_info.socket )	{

		let poke = {
			token: "poke",
			client: reg_info.client
		};
		reg_info.socket.send( JSON.stringify( poke ) );
	}
}

/////////////////////////////////////////////////////////

function display_client_index( id )	{

	var id_div = document.getElementById( client_page_index_id );
	id_div.innerHTML = id;
}

function output_log_response( response_obj )	{

	let log_area = document.getElementById( client_output_log_id );
	log_area.value += "response: ";
	log_area.value += JSON.stringify( response_obj, null, 4 );
	log_area.value += '\n';
	log_area.scrollTop = log_area.scrollHeight;
}

/////////////////////////////////////////////////////////

function register_request_handler( result_obj )	{

	console.log( "register result_obj:" );
	console.log( JSON.stringify( result_obj, null, 2 ) );

	reg_info.client = result_obj.client;

//	if( reg_info.socket !== null ) {} // destroy

//	reg_info.socket = new WebSocket( result_obj.portal.local );
	reg_info.socket = new WebSocket( result_obj.portal.tunnel );
//	reg_info.socket = new WebSocket( result_obj.portal.secure );

	reg_info.socket.addEventListener(
		"open",
		function( event ) {

			display_client_index( reg_info.client.id );
			console.log( "Client open event." );

			let websock_reg = {
				token: "REGISTER",
				client: reg_info.client
			};
			reg_info.socket.send( JSON.stringify( websock_reg ) );

// NOT SUFFICIENT TO SUSTAIN
			let HEARTBEAT = 120000; // outside of 60 sec timeout
			setInterval( () =>	{

				let server_ping = {
					token: "PING",
					client: reg_info.client
				};
				reg_info.socket.send( JSON.stringify( server_ping ) );

			}, HEARTBEAT );

		}
	);

	reg_info.socket.addEventListener(
		'message',
		function( event ) {

			let data_obj = JSON.parse( event.data );

			if( data_obj.token )	{

				let tok = data_obj.token;

				if( tok === "PONG" )	{

					console.log( "server PONG" );

				}
				else
				if( tok === "POKE" )	{

					let server_alive = {
						token: "ALIVE",
						client: reg_info.client
					};
					reg_info.socket.send( JSON.stringify( server_alive ) );

				}
				else
				if( tok === "poke" )	{

					let alive = {
						token: "alive",
						client: reg_info.client
					};
					reg_info.socket.send( JSON.stringify( alive ) );

				}
				else
				if( tok === "clients" )	{

					console.log( "clients: " + data_obj.clients );
					output_log_response( data_obj );

				}
				else
				if( tok === "alive" )	{

					console.log( "alive: " + data_obj.id );
					output_log_response( data_obj );

				}
				else	{

					console.log( "Client unhandled token event:" );
					console.log( JSON.stringify( data_obj, null, 2 ) );

				}
			}
			else	{

				console.log( "Client unhandled event:" );
				console.log( JSON.stringify( data_obj, null, 2 ) );

			}

		}
	);

	reg_info.socket.addEventListener(
		'error',
		function( event ) {

			console.log( "Client error event:" );
			console.log( " event: ", event );
		}
	);
}

/////////////////////////////////////////////////////////

function fetch_request( url, fetch_config, callback )	{

	fetch(
		url,
		fetch_config
	).then(
		function( result ) {

			if( result.status === 200 )	{

				return( result.json() ); // return promise passes to next handler
			}

			console.log( "RESULT status: " + result.status );

			if( result.status === 404 )	{
				return(
					{
						status: false,
						payload: "fetch_request: 404 error"
					}
				);
			}
			if( result.status === 500 )	{
				return(
					{
						status: false,
						payload: "fetch_request: 500 Internal Server Error"
					}
				);
			}
			if( result.status === 502 )	{
				return(
					{
						status: false,
						payload: "fetch_request: 502 Bad Gateway"
					}
				);
			}

			// RESUBMIT
			if( result.status === 504 )	{

				return( // timeout
					{
						status: true,
						payload: "fetch_request: 504 timeout resubmit ?"
					}
				);
			}

			console.log( "UNHANDLED status: " + result.status );
  		}
  	).then(
  		function( result_obj ) {
			callback( result_obj );
		}
  	).catch(
  		function( error ) {
//  		output_log_error( "fetch_request FAILED: " + url );
        	console.error( error );
		}
	);
}

function fetch_get_request( url, callback )	{

	fetch_request(
		url,
		{
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
		},
		callback
	);
}

function fetch_post_request( url, cmd_obj, callback )	{

	fetch_request(
		url,
		{
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( cmd_obj ),
		},
		callback
	);
}

