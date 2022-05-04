// https://github.com/localtunnel/localtunnel

//	> npm install -g localtunnel
//	> yarn add localtunnel  ??  As a dependency in your project
//	> lt --port 8000

const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3000 });

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  tunnel.url;

  tunnel.on('close', () => {
    // tunnels are closed
  });
})();

