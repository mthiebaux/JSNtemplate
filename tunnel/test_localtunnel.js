// https://github.com/localtunnel/localtunnel

// https://www.npmjs.com/package/localtunnel

// https://www.tabnine.com/code/javascript/modules/localtunnel


//	> npm install -g localtunnel
//	> yarn add localtunnel  ??  As a dependency in your project
//	> lt --port 8000

const localtunnel = require('localtunnel');

(async () => {

  const tunnel = await localtunnel(
  		{
  			port: 8080,
			subdomain: "mthiebaux"
  		}
  	);

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  console.log( tunnel.url );

  tunnel.on('close', () => {
    // tunnels are closed
  });
})();

/*

https://github.com/localtunnel/localtunnel

	npx localtunnel --port 8080


https://techmonger.github.io/14/localtunnel-example/

	npx localtunnel --port 8080 --subdomain mthiebaux


*/

