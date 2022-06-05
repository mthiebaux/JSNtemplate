
export {
	app_init,
	clear_text_buffer,
	default_enter_input_event,
	submit_connect_request,
	submit_push,
	submit_who,
	submit_send
};

/////////////////////////////////////////////////////////

let client_index_id = "";
let input_buffer_id = "";
let output_buffer_id = "";
let output_log_id = "";

let client_id = -1;
let client_uuid = null;


let ping_count = 0;
let pong_count = 0;
let ping_mode = true; // start/stop

/////////////////////////////////////////////////////////

function app_init( client_id, input_id, output_id, log_id )	{

	client_index_id = client_id;
	input_buffer_id = input_id;
	output_buffer_id = output_id;
	output_log_id = log_id;

	submit_connect_request(); // refresh id and uuid
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

				return( // trigger resubmit
					{
						status: true,
						payload: "fetch_request: 504 timeout resubmit poll"
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
  			output_log_error( "fetch_request FAILED: " + url );
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

function display_client_index( id )	{

	var id_div = document.getElementById( client_index_id );
	id_div.innerHTML = id;
}

function output_text_message( msg_str )	{

	let msg_area = document.getElementById( output_buffer_id );
	msg_area.value = msg_str;
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

function submit_connect_request()	{ // called by 'conn' button

	function receive_uuid_request( response_obj )	{

	//	console.log( response_obj );
		output_log_response( response_obj );

		client_id = response_obj.client.id;
		client_uuid = response_obj.client.uuid;

		display_client_index( client_id );

		submit_long_poll(); // start/initiate long polling loop
	}

	fetch_get_request( "uuid", receive_uuid_request );
}

function submit_long_poll()	{

	let poll_request = {
		id: client_id,
		uuid: client_uuid
	};
	fetch_post_request( "poll", poll_request, receive_poll_response );
}

/////////////////////////////////////////////////////////

function respond_p2p_message( to, text )	{

	let payload = {
		id: client_id,
		uuid: client_uuid,
		to: [ to ],
		text: text
	};

	fetch_post_request(
		"send",
		payload, // { id, uuid, to[id], text }
		output_log_response
	);
}

function ping_pong( from, gsi )	{

	const ping_pong_timeout_ms = 500;
	const pong_ping_timeout_ms = 500;

	let token = gsi.trim();

	if( token === "ping" )	{

		ping_count++;
		output_text_message( "pingpong[ " + ping_count + ", " + pong_count + " ]" );

		if( ping_mode )	{
			setTimeout( () => {
				respond_p2p_message( from, "pong" );
			}, ping_pong_timeout_ms );
		}

		return( true );
	}
	if( token === "pong" )	{

		pong_count++;
		output_text_message( "pingpong[ " + ping_count + ", " + pong_count + " ]" );

		if( ping_mode )	{

			setTimeout( () => {
				respond_p2p_message( from, "ping" );
			}, pong_ping_timeout_ms );
		}

		return( true );
	}
	if( token === "stop" )	{

		console.log( "STOP" );
		output_text_message( "pingpong STOP" );

		ping_mode = false;

		return( true );
	}
	if( token === "start" )	{

		console.log( "START" );
		output_text_message( "pingpong START" );
		ping_mode = true;

		return( true );
	}

	return( false );
}

function process_incoming_poll_response( response )	{

	if( response.report )	{

//	console.log( 1 );

		if( response.payload )	{

//	console.log( 2 );

			if( response.payload.text )	{

//	console.log( 6 );


				if( ping_pong( response.payload.from, response.payload.text ) )	{

				}
				else	{
					// other message

					console.log( "text:" + response.payload.text );
					output_text_message( "< " + response.payload.from + " >" + response.payload.text );
				}

			}
			else	{

//	console.log( 20 );
//				console.log( "PAYLOAD ERR no text from:" + response.payload.from );
			}

		}
		else	{

	console.log( 100 );

			console.log( "process_incoming_poll_response ERR no payload:" + response );
		}
	}
	else	{

//	console.log( 1000 );

//		console.log( "process_incoming_poll_response ERR no report:" + response );
	}
}

function receive_poll_response( response_obj )	{

// general request handler: push, forward, exit

	if( response_obj.status === true )	{

		output_log_response( response_obj );
//		output_log_response( response_obj.payload );

		process_incoming_poll_response( response_obj );

		submit_long_poll(); // resubmit long poll only on status true
	}
	else	{

		output_log_response( response_obj );

		if( response_obj.status === undefined )	{
			let e = "server HARD error - no status";
			console.log( e );
			output_log_response( { msg: e } );
		}
	}
}

function submit_who()	{

	fetch_get_request( "who", ( response_obj ) => {

			output_text_message( "current[ " + response_obj.current.join( ', ' ) + " ]" );
			output_log_response( response_obj );
		}
	);
}

function submit_push()	{

	fetch_get_request( "push", output_log_response );
}

function parse_text_input_payload( gsi )	{ // garbage string input to number array + text

	function isNumeric(n) {
		return( !isNaN( parseFloat( n ) ) && isFinite( n ) );
	}

	let payload = {
		id: client_id,
		uuid: client_uuid
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
		parse_text_input_payload( input_elem.value ), // { id, uuid, to[id], text }
		output_log_response
	);
}

/////////////////////////////////////////////////////////

function default_enter_input_event( text_event ) {

	// text utility: on enter
	if( text_event.code == "Enter" ) 	{
		console.log( "default_enter_input_event: send" );
		submit_send();
	}
}

function clear_text_buffer( id ) 	{

	let text_el = document.getElementById( id );
	text_el.value = '';
}


