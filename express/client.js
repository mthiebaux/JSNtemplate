
let input_buffer_id = "";
let output_log_id = "";

function client_app_init( input_id, log_id )	{

	console.log( "client_app" );
	input_buffer_id = input_id;
	output_log_id = log_id;

// Feature testing:
	let result = {};
	result = globalThis[ globalThis.rpc_process_command.name ]( { cmd: "add", args: [ 2, 2 ] } );
	console.log( result );
	let v = result.value;
	result = globalThis[ globalThis.rpc_process_command.name ]( { cmd: "mul", args: [ v, v ] } );
	console.log( result );

	fetch_get_request( "data.json", output_log_response );

	fetch_get_request( "api?a=b&c=d", output_log_response );
	fetch_get_request( "api/A/B", output_log_response );
	fetch_get_request( "api/A/B?a=b&c=d", output_log_response );

	fetch_post_request( "test?a=b&c=d", {}, output_log_response );
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
        }
    );
}

/////////////////////////////////////////////////////////

function output_log_response( response_obj )	{

	let log_area = document.getElementById( output_log_id );

	log_area.value += "response: ";
	log_area.value += JSON.stringify( response_obj, null, 2 );
	log_area.value += '\n';
	log_area.scrollTop = log_area.scrollHeight;
}

function submit_api()	{

	fetch_get_request( "api", output_log_response );
}

function submit_command( rpc_cmd )	{

	let input_area = document.getElementById( input_buffer_id );

	let arg_arr = input_area.value.split( ',' ).join( ' ' ).split( ' ' ).map(
		s => Number( s )
	).filter(
		s => s	// strip out any null, NaN, etc.
	);
	input_area.value = arg_arr.join( ', ' );	// clean up the input box

	let input_obj = {

		rpc: globalThis.rpc_process_command.name,	// from lib.js
		cmd: rpc_cmd,
		args: arg_arr
	}

	fetch_post_request( "RPC", input_obj, output_log_response );
}

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_input, text_event ) { // text utility: on enter

	if( text_event.code == "Enter" ) 	{
		console.log( "Enter, clear" );
		submit_command( "add" );
		text_input.value = '';
	}
}


