
export {
	app_init,
	print_local_storage,
	get_local_storage_profile
};

const local_storage_app_key = "jsntemplate-storage-app";

let output_log = null;

function app_init( output_log_f )	{

	output_log = output_log_f;
}

/////////////////////////////////

if( 0 )	{
	localStorage.clear();
}
if( 0 )	{

	// For testing: run once after clearing website-data from browsers

	function profile_testing_setup()	{

		localStorage.clear();
		let app_storage_obj = {
			profiles:	{
				"A": {
					"registration":	"a07d4b07-fd03-4587-84f1-ef6795a8afd9",
					"session":		"fb047635-c3ba-4624-97bf-ec32576b4b9f"
				},
				"B": {
					"registration":	"7853b338-736c-4484-bd0d-f520fc6477c9",
					"session":		""
				}
			}
		};
		localStorage.setItem(
			local_storage_app_key,
			JSON.stringify( app_storage_obj )
		);
	}
	profile_testing_setup();
}

/////////////////////////////////

function init_local_storage_app_profiles()	{ // create if none exists

	if( localStorage.getItem( local_storage_app_key ) === null )	{

		console.log( "Creating new storage: " + local_storage_app_key );

		localStorage.setItem(
			local_storage_app_key,
			JSON.stringify( { profiles: {} } )
		);
	}
}
init_local_storage_app_profiles(); // ensure it exists

/////////////////////////////////

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
			registration: "",
			session: ""
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

/////////////////////////////////

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

//	update_profile_field( "D", "registration", "XXX" );

