
export {
	open_registration,
	open_socket,
	app_init,
	app_send,
	reg_info
};

let client_page_index_id = "";
let process_client_token = null;
let output_client_log = null;

let reg_info = {
	client: {
		id: -1,
		uuid: ""
	},
	uri: "",
	socket: null,
	ival_id: null
};

let srv_ping_out = false;

/////////////////////////////////////////////////////////

function app_init( page_client_id, process_token_f, output_log_f )	{

	client_page_index_id = page_client_id;
	process_client_token = process_token_f;
	output_client_log = output_log_f;

	open_registration();
}

function app_send( submit_obj )	{

	if( reg_info.socket )	{
		reg_info.socket.send( JSON.stringify( submit_obj ) );
	}
	else	{
		console.log( "app_send ERR: socket not registered" );
	}
}

/////////////////////////////////////////////////////////

function display_client_index()	{

	var id_div = document.getElementById( client_page_index_id );
	id_div.innerHTML = reg_info.client.id;
}

/////////////////////////////////////////////////////////

function close_socket()	{

	if( reg_info.ival_id !== null )	{

		clearInterval( reg_info.ival_id );
		reg_info.ival_id = null;
	}
	if( reg_info.socket !== null ) {

		reg_info.socket.close();
//		reg_info.socket.terminate(); // undefined
		reg_info.socket = null;
	}

}

function open_socket()	{

	close_socket();

	reg_info.socket = new WebSocket( reg_info.uri );

	reg_info.socket.addEventListener(
		"open",
		function( event ) {

			display_client_index();
			console.log( "Client open event." );

			let websock_reg = {
				token: "REGISTER",
				client: reg_info.client
			};
			reg_info.socket.send( JSON.stringify( websock_reg ) );

			if( 1 )	{
			// NOT SUFFICIENT TO SUSTAIN AGAINST TIMEOUTS

//				let HEARTBEAT = 120000; // outside of 60 sec timeout
				let HEARTBEAT = 10000; // inside of 30 sec server poke

				reg_info.ival_id = setInterval( () =>	{

					if( srv_ping_out )	{

						console.log( "ERR: PONG not received after " + HEARTBEAT );
						srv_ping_out = false;

						open_registration();
					}
					else	{

						let server_ping = {
							token: "PING",
							client: reg_info.client
						};
						srv_ping_out = true;
						reg_info.socket.send( JSON.stringify( server_ping ) );
					}

				}, HEARTBEAT );
			}

		}
	);

	reg_info.socket.addEventListener(
		'message',
		function( event ) {

			let data_obj = JSON.parse( event.data );

			if( data_obj.token )	{

				let tok = data_obj.token;

				if( tok === "PONG" )	{

					srv_ping_out = false;
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
				if( tok === "push" )	{ // server initiated push token

					output_client_log( { msg: "server push." } );
					console.log( "server push" );
				}
				else
				if( tok === "close" )	{ // server initiated close on exit

					close_socket();
					reg_info.client.id = -1;
					reg_info.client.uuid = "";
					display_client_index();

					output_client_log( { msg: "server closed." } );
					console.log( "Server closed." );
				}
				else	{

					if( process_client_token( data_obj ) == false )	{ // hand off to app

						console.log( "Client unhandled token event:" );
						console.log( JSON.stringify( data_obj, null, 2 ) );
					}
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

function register_request_handler( result_obj )	{

	console.log( "register result_obj:" );
	console.log( JSON.stringify( result_obj, null, 2 ) );

	reg_info.client = result_obj.client;

/*
	console.log( "href:			" + window.location.href );
	console.log( "origin:		" + window.location.origin );
	console.log( "protocol:		" + window.location.protocol );	// http:
	console.log( "host:			" + window.location.host );		// localhost:8080
	console.log( "hostname:		" + window.location.hostname );
	console.log( "pathname:		" + window.location.pathname );
	console.log( "port:			" + window.location.port );
*/
// When SSL certs are functioning, check location.protocol for https --> wss

	reg_info.uri = "ws://" + window.location.host;
	console.log( "WebSocket URI: " + reg_info.uri );

	open_socket();
}

function open_registration()	{

	fetch_get_request( "register", register_request_handler );
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

			if( result.status === 504 )	{

				return( // timeout
					{
						status: true,
						payload: "fetch_request: 504 timeout... resubmit ?"
					}
				);
			}

			console.log( "UNHANDLED status: " + result.status );
  		}
  	).then(
  		function( result_obj ) {

			callback( result_obj ); // success
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

