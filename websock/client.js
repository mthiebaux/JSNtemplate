
export {
	app_init,
	app_send,
	reg_info
};

let client_page_index_id = "";
let process_client_token = null;

let reg_info = {
	client: {
		id: -1,
		uuid: ""
	},
	socket: null
};

/////////////////////////////////////////////////////////

function app_init( page_client_id,process_token_f )	{

	client_page_index_id = page_client_id;
	process_client_token = process_token_f;

	fetch_get_request( "register", register_request_handler );
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

function display_client_index( id )	{

	var id_div = document.getElementById( client_page_index_id );
	id_div.innerHTML = id;
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

		// NOT SUFFICIENT TO SUSTAIN AGAINST TIMEOUtS
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
				else	{

					let handled = false;
					if( process_client_token )	{
						handled = process_client_token( data_obj );
					}
					if( !handled )	{
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

