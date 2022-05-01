
let input_buffer_id = "";
let output_log_id = "";

let client_id = -1;
let client_uuid = null;

function client_app_init( input_id, log_id )	{

	input_buffer_id = input_id;
	output_log_id = log_id;

	fetch_get_request( "uuid", receive_uuid_request );
}

/////////////////////////////////////////////////////////

function fetch_get_request( url, callback )	{

	fetch(
		url,
		{
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
		}
	).then(
		function( response ) {
    		return response.text().then(
    			function( text ) {

    				callback( JSON.parse( text ) );
				}
			)
		}
	).catch(
		err => {
        	console.error( err );
        	callback( { error: "fetch_get_request FAILED", url: url } );
        }
    );
}

function fetch_post_request( url, cmd_obj, callback )	{

	fetch(
		url,
		{
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( cmd_obj ),
		}
	).then(
		function( response ) {
    		return response.text().then(
    			function( text ) {

    				callback( JSON.parse( text ) );
				}
			)
		}
	).catch(
		err => {
        	console.error( err );
        	callback( { error: "fetch_post_request FAILED", url: url } );
        }
    );
}

/////////////////////////////////////////////////////////

function output_log_response( response_obj )	{

	let log_area = document.getElementById( output_log_id );

	log_area.value += "response: ";
	log_area.value += JSON.stringify( response_obj, null, 4 );
	log_area.value += '\n';
	log_area.scrollTop = log_area.scrollHeight;
}

function receive_uuid_request( response_obj )	{

//	console.log( response_obj );
	output_log_response( response_obj );

//	client_id = response_obj.id;
//	client_uuid = response_obj.uuid;
	client_id = response_obj.client.id;
	client_uuid = response_obj.client.uuid;
	submit_poll();
}

function receive_poll_request( response_obj )	{

	console.log( response_obj );
	output_log_response( response_obj );

	if( response_obj.status === true )	{

		// handle push from server here



		submit_poll(); // resubmit long poll
	}
	else
	if( response_obj.status === undefined )	{

		console.log( "server HARD exit." );
		output_log_response( { msg: "server HARD exit." } );
	}
	else	{
		console.log( "server exit." );
		output_log_response( { msg: "server exit." } );
	}
}

function submit_poll()	{

	let poll_request = {
		id: client_id,
		uuid: client_uuid
	};
	fetch_post_request( "poll", poll_request, receive_poll_request );
}

function submit_who()	{

	fetch_get_request( "who", output_log_response );
}

/*
function submit_api()	{

	let input_el = document.getElementById( input_buffer_id );
	fetch_get_request( "api" + input_el.value, output_log_response );
}

function submit_post()	{

	let input_el = document.getElementById( input_buffer_id );
	fetch_post_request( "test" + input_el.value, {}, output_log_response );
}

function submit_command( rpc_cmd )	{

	let input_el = document.getElementById( input_buffer_id );

	let arg_arr = input_el.value.split( ',' ).join( ' ' ).split( ' ' ).map(
		s => Number( s )
	).filter(
		s => s	// strip out any null, NaN, etc.
	);
	input_el.value = arg_arr.join( ', ' );	// clean up input box for numbers

	let input_obj = {

		rpc: globalThis.rpc_process_command.name,	// from lib.js
		cmd: rpc_cmd,
		args: arg_arr
	}

	fetch_post_request( "RPC", input_obj, output_log_response );
}
*/

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_input, text_event ) { // text utility: on enter

	if( text_event.code == "Enter" ) 	{
		console.log( "Enter, post, clear" );
//		submit_command( "add" );
		text_input.value = '';
	}
}


