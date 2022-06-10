
export {
	print_local_storage,
	app_init,
	app_register,
	app_connect,
	app_send
};

const local_storage_app_key = "jsntemplate-storage-app";

let output_log = null;

let client_info = {
	name: "",
	registration: null,
	socket: null
}

/////////////////////////////////////////////////////////

function app_init( output_log_f )	{

	output_log = output_log_f;
}

function app_register( name, pass )	{

	client_info.name = name;
	client_info.registration = get_local_storage_profile( name );
	if( client_info.registration === null )	{

		output_log( "ERR: profile should already exist: " + name );
		return;
	}
	output_log( "Register: " + name );
//	output_log( client_info.registration );

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

function app_connect()	{

	open_socket();
}

function register_request_handler( response_obj )	{

	output_log( response_obj.result );

	if( response_obj.result.registration )	{

		output_log( "registered" );

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

function app_send( token, to, payload )	{

	if( client_info.socket )	{

		let send_obj = {
			token: token,
			client: {
				name: client_info.name,
				registration: client_info.registration
			},
			to: to,
			payload: payload
		};

		client_info.socket.send( JSON.stringify( send_obj ) );
	}
	else	{
		console.log( "app_send ERR: socket not registered" );
	}
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
//init_local_storage_app_profiles(); // ensure it exists

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

/////////////////////////////////////////////////////////

function close_socket()	{

/*
	if( reg_info.ival_id !== null )	{

		clearInterval( reg_info.ival_id );
		reg_info.ival_id = null;
	}
*/
	if( client_info.socket !== null ) {

		client_info.socket.close();
		client_info.socket = null;
	}

}

function open_socket()	{

	close_socket();

	let websock_uri = "ws://" + window.location.host;
	console.log( "WebSocket URI: " + websock_uri );

	client_info.socket = new WebSocket( websock_uri );

	client_info.socket.addEventListener(
		"open",
		function( event ) {

			console.log( "Client open event." );

			let websock_reg = {
				token: "connect",
				client: {
					name: client_info.name,
					registration: client_info.registration
				}
			};
			client_info.socket.send( JSON.stringify( websock_reg ) );

		}
	);

	client_info.socket.addEventListener(
		'message',
		function( event ) {

			let data_obj = JSON.parse( event.data );

			if( data_obj.token )	{

				let tok = data_obj.token;

				if( tok === "HELLO" )	{

					output_log( "server HELLO" );

				}
				else
				if( tok === "ERROR" )	{

					output_log( data_obj );

				}
				else	{

//					if( process_client_token( data_obj ) == false )	{ // hand off to app
					if( 1 )	{

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






