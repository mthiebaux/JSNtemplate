
let input_buffer_id = "";
let output_log_id = "";

function client_app_init( input_id, log_id )	{

	input_buffer_id = input_id;
	output_log_id = log_id;

// Feature testing:
if( 0 )	{
	let result = {};
	result = globalThis[ globalThis.rpc_process_command.name ]( { cmd: "add", args: [ 2, 2 ] } );
	console.log( result );
	let v = result.value;
	result = globalThis[ globalThis.rpc_process_command.name ]( { cmd: "mul", args: [ v, v ] } );
	console.log( result );
}
if( 1 )	{
	fetch_get_request( "api?a=b&c=d", output_log_response );
	fetch_get_request( "api/A/B", output_log_response );
	fetch_get_request( "api/A/B?a=b&c=d", output_log_response );
}
if( 0 )	{
	fetch_post_request( "test/A/B?a=b&c=d", {}, output_log_response );
	fetch_post_request( "RPC", { rpc: "rpc_stub", cmd: null, args: [] }, output_log_response );
	fetch_post_request( "RPC", { rpc: "no_rpc" }, output_log_response );
	submit_command( "add" );
}
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
		function( result ) {
			return( result.json() ); // return promise passes to next handler
  		}
  	).then(
  		function( result_obj ) {
			callback( result_obj );
		}
  	).catch(
  		function( error ) {
  			output_log_error( "can't load json from: " + url );
        	console.error( error );
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
		function( result ) {
			return( result.json() ); // return promise passes to next handler
  		}
  	).then(
  		function( result_obj ) {
			callback( result_obj );
		}
  	).catch(
  		function( error ) {
  			output_log_error( "can't load json from: " + url );
        	console.error( error );
		}
	);
}

/////////////////////////////////////////////////////////

function output_log_error( err_str )	{

	let log_area = document.getElementById( output_log_id );
	log_area.value += "ERROR: " + err_str + '\n';
	log_area.scrollTop = log_area.scrollHeight;
}

function output_log_response( response_obj )	{

	let log_area = document.getElementById( output_log_id );

	log_area.value += "response: ";
	log_area.value += JSON.stringify( response_obj, null, 4 );
	log_area.value += '\n';
	log_area.scrollTop = log_area.scrollHeight;
}

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

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_input, text_event ) { // text utility: on enter

	if( text_event.code == "Enter" ) 	{
		console.log( "Enter, add, clear" );
		submit_command( "add" );
		text_input.value = '';
	}
}


