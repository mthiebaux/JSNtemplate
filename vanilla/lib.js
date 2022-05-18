
globalThis.rpc_process_command =
function rpc_process_command( input )	{

	console.log( input );

	let output = {};
	if( input.cmd === "add" )	{

		let sum = 0;
		for( let v of input.args )	{
			sum += v;
		}
		output.value = sum;
	}
	else
	if( input.cmd === "mul" )	{

		let prod = 1;
		for( let v of input.args )	{
			prod *= v;
		}
		output.value = prod;
	}
	else	{
		output.value = "rpc_process_command ERR: cmd \'" + input.cmd + "\' not found"
	}

	return( output );
}
