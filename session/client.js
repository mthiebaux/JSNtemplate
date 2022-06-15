
export {
	app_init,
	app_register,
//	app_connect,
	app_who,
	app_send,
	print_local_storage,
	clear_storage_profiles
};

const local_storage_app_key = "jsntemplate-storage-app";

let set_dest_buffer = null;
let app_receive_msg = null;
let output_log = null;

let client_info = {
	name: 			"",
	registration:	null,
	socket:			null,
	interval:		null,
	pingout:		false
};

/////////////////////////////////////////////////////////

function app_init( set_dest_f, receive_msg_f, output_log_f )	{

	set_dest_buffer = set_dest_f;
	app_receive_msg = receive_msg_f;
	output_log = output_log_f;
}

function register_request_handler( response_obj )	{

	output_log( response_obj.result );

	if( response_obj.result.registration )	{

		client_info.registration = response_obj.result.registration;

		update_profile_field(
			client_info.name,
			"registration",
			client_info.registration
		);

		open_socket();
	}
	else	{
		output_log( "registration failed" );
	}
}

function app_register( name, pass )	{

	client_info.name = name;

	let profile = get_local_storage_profile( name );
	client_info.registration = profile.registration;

	if( client_info.registration === null )	{

		output_log( "ERR: profile should already exist: " + name );
		return;
	}

	let register_obj = {
		name:		name,
		password:	pass
	}
	fetch_post_request(
		"register",
		register_obj,
		register_request_handler
	);
}

/*
function app_connect( name )	{

	client_info.name = name;

	if( client_info.name )	{

		let profile = get_local_storage_profile( name );
		client_info.registration = profile.registration;

		output_log( "Connect: " + name + " : " + client_info.registration );

		open_socket();
	}
	else	{
		console.log( "ERR: no name specified" );
	}
}
*/

function app_who()	{

//	active_peers = [];

	if( client_info.socket )	{

		let who_obj = {
			token: "who",
			client: {
				name: client_info.name,
				registration: client_info.registration
			}
		};

		set_dest_buffer( "" );
		client_info.socket.send( JSON.stringify( who_obj ) );
	}
	else	{
		console.log( "app_who ERR: socket not registered" );
	}
}

function app_send( token, to_arr, payload )	{

	if( client_info.socket )	{

		let send_obj = {
			token: token,
			client: {
				name: client_info.name,
				registration: client_info.registration
			},
			to: to_arr,
			payload: payload
		};
		client_info.socket.send( JSON.stringify( send_obj ) );
	}
	else	{
		console.log( "app_send ERR: socket not registered" );
	}
}

/////////////////////////////////////////////////////////

function stop_interval()	{

	client_info.pingout = false;
	if( client_info.interval !== null )	{

		clearInterval( client_info.interval );
		client_info.interval = null;
	}
}

function close_socket()	{

	stop_interval();
	if( client_info.socket !== null ) {

		client_info.socket.close();
		client_info.socket = null;
	}
}

function open_socket()	{

	close_socket(); // always close previous

	let websock_uri = "ws://" + window.location.host;
	console.log( "WebSocket URI: " + websock_uri );

	client_info.socket = new WebSocket( websock_uri ); // always produce new socket

	client_info.socket.addEventListener(
		"open",
		function( event ) {

			console.log( "Client open event." );

			let connect_obj = {
				token: "connect",
				client: {
					name: client_info.name,
					registration: client_info.registration
				}
			};
			client_info.socket.send( JSON.stringify( connect_obj ) );

			if( 1 )	{ // used to auto-reconnect with server restart

				let HEARTBEAT = 10000; // inside of 30 sec server poke

				client_info.interval = setInterval( () =>	{

					if( client_info.pingout )	{

						console.log( "ERR: PONG not received after " + HEARTBEAT );
						client_info.pingout = false;

						open_socket();
					}
					else	{

						client_info.pingout = true;
						app_send( "PING", [], {} );

					}

				}, HEARTBEAT );
			}

		}
	);

	client_info.socket.addEventListener(
		'message',
		function( event ) {

			let data_obj = JSON.parse( event.data );

			if( data_obj.token )	{

				let tok = data_obj.token;

				if( tok === "CONNECT" )	{

					output_log( data_obj );
				}
				else
				if( tok === "DISCONNECT" )	{

					stop_interval();
					output_log( data_obj );
				}
				else
				if( tok === "ERROR" )	{

					output_log( data_obj );
				}
				else
				if( tok === "PONG" )	{

					client_info.pingout = false;
//					output_log( data_obj );
				}
				else
				if( tok === "CLIENTS" )	{ // server response to client who

					output_log( data_obj.payload );
				}
				else
				if( tok === "recv" )	{ // forwarded client peer send

					let pay_tok = data_obj.payload.token;

					if( pay_tok === "message" )	{

						app_receive_msg( data_obj.from, data_obj.payload );
					}
					else	{

						console.log( "Client unhandled payload token event:" );
						console.log( JSON.stringify( data_obj, null, 2 ) );
					}
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

	client_info.socket.addEventListener(
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

			throw new Error( "UNHANDLED status: " + result.status );
  		}
  	).then(
  		function( result_obj ) {

			callback( result_obj ); // success
		}
  	).catch(
  		function( error ) {

        	console.log( error );
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

if( 0 )	{
	localStorage.clear(); // force sratch
}

// IIFE for automatic storage loading
( function init_local_storage_app_profiles()	{ // create if none exists

	if( localStorage.getItem( local_storage_app_key ) === null )	{

		console.log( "Creating new storage: " + local_storage_app_key );

		localStorage.setItem(
			local_storage_app_key,
			JSON.stringify( { profiles: {} } ) // scratch
		);
	}
} )();

function clear_storage_profiles()	{

	localStorage.clear();
	localStorage.setItem(
		local_storage_app_key,
		JSON.stringify( { profiles: {} } ) // scratch
	);

	output_log( "local storage profiles cleared" );
}

///////////////////////////

function print_local_storage()	{

	let app_storage_obj = JSON.parse( localStorage.getItem( local_storage_app_key ) );
	output_log( app_storage_obj );
}

function create_local_storage_profile( name )	{

	let app_storage_obj = JSON.parse( localStorage.getItem( local_storage_app_key ) );

	if( app_storage_obj.profiles.hasOwnProperty( name ) )	{

		output_log( "Create profile ERR: name exists: " + name );
	}
	else	{
		output_log( "Creating new profile: " + name );

		app_storage_obj.profiles[ name ] = {
			registration: ""
		};
		localStorage.setItem(
			local_storage_app_key,
			JSON.stringify( app_storage_obj )
		);
	}
	return( app_storage_obj.profiles[ name ] );
}

function get_local_storage_profile( name )	{

	let app_storage_obj = JSON.parse( localStorage.getItem( local_storage_app_key ) );

	if( app_storage_obj.profiles.hasOwnProperty( name )	)	{

		return( app_storage_obj.profiles[ name ] );
	}
	return( create_local_storage_profile( name ) );
}

function update_profile_field( name, field, uuid )	{

//	const recognized_fields = [];

	let app_storage_obj = JSON.parse( localStorage.getItem( local_storage_app_key ) );

	if( app_storage_obj.profiles.hasOwnProperty( name )	)	{

		let profile = app_storage_obj.profiles[ name ];
		profile[ field ] = uuid;

		localStorage.setItem(
			local_storage_app_key,
			JSON.stringify( app_storage_obj )
		);
		return;
	}
	output_log( "Update \'" + field + "\' ERR: name does not exist: " + name );
}





