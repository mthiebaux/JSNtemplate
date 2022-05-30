
export {
	app_init,
	poke_server,
	who_server
};

let client_page_index_id = "";
let client_poke_button_id = "";
let client_who_button_id = "";
let client_output_log_id = "";

let client_info = { id: -1 };

let client_socket = null;

/////////////////////////////////////////////////////////

function app_init( page_client_id, poke_button_id, who_button_id, output_log_id )	{

	client_page_index_id = page_client_id;
	client_poke_button_id = poke_button_id;
	client_who_button_id = who_button_id;
	client_output_log_id = output_log_id;

	fetch_get_request( "connect", connect_request_handler );
}

function who_server()	{

	if( client_socket )	{

		let who = {
			token: "who",
			client: client_info
		};
		client_socket.send( JSON.stringify( who ) );
	}
}

function poke_server()	{

	if( client_socket )	{

		let poke = {
			token: "poke",
			client: client_info
		};
		client_socket.send( JSON.stringify( poke ) );
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

function create_socket( portal )	{

//	const wsclient = new WebSocket( portal.local );
	const wsclient = new WebSocket( portal.tunnel );
//	const wsclient = new WebSocket( portal.secure );

	wsclient.addEventListener(
		"open",
		function( event ) {

			display_client_index( client_info.id );
			console.log( "Client open event." );

// NOT SUFFICIENT TO SUSTAIN
			let HEARTBEAT = 120000; // outside of 60 sec timeout
			setInterval( () =>	{

				let server_ping = {
					token: "PING",
					client: client_info
				};
				wsclient.send( JSON.stringify( server_ping ) );

			}, HEARTBEAT );

		}
	);

	wsclient.addEventListener(
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
						client: client_info
					};
					wsclient.send( JSON.stringify( server_alive ) );

				}
				else
				if( tok === "poke" )	{

					let alive = {
						token: "alive",
						client: client_info
					};
					wsclient.send( JSON.stringify( alive ) );

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

	wsclient.addEventListener(
		'error',
		function( event ) {

			console.log( "Client error event:" );
			console.log( " event: " + event );
		}
	);

	return( wsclient );
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
//  			output_log_error( "fetch_request FAILED: " + url );
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

/////////////////////////////////////////////////////////

function connect_request_handler( result_obj )	{

	console.log( "connect result_obj:" );
	console.log( JSON.stringify( result_obj, null, 2 ) );

	client_info = result_obj.client;


	if( result_obj.portal )	{


		client_socket = create_socket( result_obj.portal );

	}
}


