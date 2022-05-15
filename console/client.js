
let client_index_id = "";
let input_buffer_id = "";
let output_log_id = "";

let client_id = -1;
let client_uuid = null;

function client_app_init( client_id, input_id, log_id )	{

	client_index_id = client_id;
	input_buffer_id = input_id;
	output_log_id = log_id;

	submit_reconnect();

//	set_client_index( 100 );
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

function set_client_index( id )	{

	var id_div = document.getElementById( client_index_id );
	id_div.innerHTML = id;
}

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

function receive_uuid_request( response_obj )	{

//	console.log( response_obj );
	output_log_response( response_obj );

	client_id = response_obj.client.id;
	client_uuid = response_obj.client.uuid;

	set_client_index( client_id );

	submit_long_poll(); // start/initiate long polling loop
}

function submit_reconnect()	{

	fetch_get_request( "uuid", receive_uuid_request );
}

function submit_long_poll()	{

	let poll_request = {
		id: client_id,
		uuid: client_uuid
	};
	fetch_post_request( "poll", poll_request, receive_poll_response );
}

function receive_poll_response( response_obj )	{

// general request handler: push, forward, exit

	if( response_obj.status === true )	{

//		output_log_response( response_obj );
		output_log_response( response_obj.payload );

		submit_long_poll(); // resubmit long poll only on status true
	}
	else	{

		output_log_response( response_obj );

		if( response_obj.status === undefined )	{
			console.log( "server HARD exit - no status" );
			output_log_response( { msg: "server HARD exit - no status" } );
		}
	}
}

function submit_who()	{
	fetch_get_request( "who", output_log_response );
}

function parse_text_input_payload( gsi )	{ // garbage string input to number array + text

	function isNumeric(n) {
		return( !isNaN( parseFloat( n ) ) && isFinite( n ) );
	}

	let payload = {
		from: client_id
	};
	let brk = gsi.indexOf( ":" );

	if( brk !== -1 )	{

		let to_arr = gsi.slice( 0, brk ).split( ',' ).join( ' ' ).split( ' ' ).filter(
			s => { let t = s.trim(); return( t.length ); }	// strip out any ''
		).map(
			s => Number( s )
		).filter(
			n => isNumeric( n )
		);

		let text = gsi.slice( brk + 1 );

		if( to_arr.length !== 0 )	{
			payload.to = [ ...new Set( to_arr ) ]; // force unique set
			payload.text = text;
		}
		else	{
			payload.to = [ client_id ]; // default self bounce
			payload.text = "bounce: " + text;
		}

	}
	else	{
		payload.to = [ client_id ]; // default self bounce
		payload.text = "bounce = " + gsi;
	}
	return( payload );
}

function submit_send()	{

	let input_elem = document.getElementById( input_buffer_id );

	fetch_post_request(
		"send",
		parse_text_input_payload( input_elem.value ), // { from, to, text }
		output_log_response
	);
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_input, text_event ) {

	// text utility: on enter
	if( text_event.code == "Enter" ) 	{
		console.log( "default_enter_input_event" );
		submit_send();
//		text_input.value = '';
	}
}

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}


