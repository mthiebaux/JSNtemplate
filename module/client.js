
import { rpc_process_command } from './lib.mjs';

export { app_init, clear_text_buffer, default_enter_input_event, submit_command };

/////////////////////////////////////////////////////////

let input_buffer_id = "";
let output_log_id = "";

function app_init( input_id, log_id )	{

	input_buffer_id = input_id;
	output_log_id = log_id;

// Feature testing:

	let test = {};
	test = rpc_process_command( { contents: "RPC client", cmd: "add", args: [ 4, 5 ] } );
	console.log( test );

	fetch_get_request( "data.json", output_log_response );

	fetch_post_request( "test", {}, output_log_response );

	fetch_post_request( "RPC", { rpc: rpc_process_command.name, cmd: "mul", args: [ 4, 5 ] }, output_log_response );

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
  			output_log_error( "can't GET payload from: " + url );
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
  			output_log_error( "can't receive POST payload from: " + url );
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
	log_area.value += JSON.stringify( response_obj, null, 2 );
	log_area.value += '\n';

	log_area.scrollTop = log_area.scrollHeight;
}

function submit_command( rpc_cmd )	{

	let input_area = document.getElementById( input_buffer_id );

	let arg_arr = input_area.value.split( ',' ).join( ' ' ).split( ' ' ).map(
		s => Number( s )
	).filter(
		s => s	// strip out any null, NaN, etc.
	);
	input_area.value = arg_arr.join( ', ' );	// clean up the input box

	let input_req = {

		rpc: rpc_process_command.name,
		cmd: rpc_cmd,
		args: arg_arr
	}

	fetch_post_request( "RPC", input_req, output_log_response );
}

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_event ) { // text utility: on enter

	if( text_event.code == "Enter" ) 	{
		submit_command( "add" );
	}
}
