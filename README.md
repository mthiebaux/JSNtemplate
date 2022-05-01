# JSNtemplate

 **Vanilla Node.js Client/Server with RPC and Push**

<img src="./images/express_client.png" width="500">

* Comparing a bare-bones CJS server with full featured 'express' server module. These utility templates make implementing a server API an easy task, and demonstrate versatile vanilla RPC (remote procedure) support.

* While calling a remote procedure by routed key is not difficult, the challenge was to share a single library source file that both client and server can call, which can create conflicts between CJS and ESM module configurations.

* An interactive server console facilitates development and diagnostics of more complex communication. Push notifications are implemented with long polling, and clients are identified by simple id and UUID, using 'express-request-id'.


| template      | dependencies       | size
| ------------- |:------------------:|:-------------:|
| *Vanilla*     | node defaults      | 15 KB |
| *Express*     | express install    | 1.8 MB |
| *Console*     | request-id install | 2.1 MB |


## *Vanilla*

Vanilla just means a 'bare bones' implementation, using older, built-in JavaScript features such as XMLHttpRequest() on the client side, and http.createServer() on the server side.

While there may be only a few good reasons to build with what are often deprecated interfaces, they are lightweight, with few dependencies bloating the project with loads of unused features.

More specifically, they illustrate what is really happening behind the scenes when using popular modules like 'express', which hide a lot of complexity while greatly simplifying specific tasks.

There are no packages required other than what Node.js includes by default. One key drawback to the basic http server is that you must explicitly handle any and all GET requests for all types of files.


## *Express*

As the name suggests, the *Express* app imports the 'express' module which brings with it a LOT of essential functionality, like 'fs' for reading and writing files.

The example GET handlers in server.mjs demonstrate parameter passing via traditional query strings, as well as structured URL parameters widely used to implement REST APIs. These are conveniently parsed by the express module.

| param type    | example query      | parsed request inputs
| ------------- |:------------------:|:----------------------------:|
| Query string  | /api?arg1=1&arg2=2 | query: { arg1: 1, arg1: 2 }  |
| URL params    | /api/v1/v2         | params: { arg1: 'v1', arg2: 'v2' }  |

A POST request adds the option to pass arbitrary JSON contents to the server in the request body, without requiring these parameters to be exposed in the URL. This is the method used to implement the RPC call.


## *Console*

An experimental app featuring an interactive server console, push notifications, and client to client exchange.


## Installation

Clone the repo:

```
> git clone https://github.com/mthiebaux/JSNtemplate.git
```

For *Vanilla*, server.js runs right out of the box with Node.js:

```
> cd JSNtemplate/vanilla
> node server.js
```

For *Express*, node will climb up your directory tree looking for package.json files and node_modules/ folders.
If they are not already in your directory path, you can initialize node with the following commands, above or in the express/ folder:

```
> npm init
> npm install express
```

Note that to enable ESM *module import* features, the *Express* server script has been named with the *.mjs* extension:

```
> node server.mjs
```


## Testing in the Browser

By default, the server opens on port 8080, which can be changed by passing an optional port number:

```
> node server.mjs 8001
```

Then enter the localhost url in your browser, which will load index.html by default:

```
localhost:8080
```

The testing page runs several test requests on initialization specified in client.js/.mjs:client_app_init(), and the results from the server are written to the output text field. Some results also appear in your browser's JavaScript Console.

You can run similar tests directly by adding URL parameters, and see how the server reports parsed arguments in the command terminal:

```
localhost:8080/api
localhost:8080/api?a=b&c=d
localhost:8080/api/A/B
```

The *api* button will append contents from the input text field to a GET request. Each call to the /api handler (and each press of the button) reads a count value out of ./data.json, increments it, updates the file, and returns that value.

The output response object will report something like the following, mirroring the parsed inputs:

```
response: {
    "method": "GET",
    "url": "/api/A/B?a=b&c=d",
    "path": "/api/A/B",
    "params": {
        "arg1": "A",
        "arg2": "B"
    },
    "query": {
        "a": "b",
        "c": "d"
    },
    "count": 332
}
```


## Testing RPC

The input text field is set up to add and multiply numbers that you enter. The command and its arguments are sent to the server and executed as an RPC call.

The RPC function response object is written to the output text field, revealing the internals of this client-server exchange. This includes the request report with the body input payload, and the result:

```
response: {
    "report": {
        "method": "POST",
        "url": "/RPC",
        "path": "/RPC",
        "params": {},
        "query": {},
        "body": {
            "rpc": "rpc_process_command",
            "cmd": "add",
            "args": [ 2, 2 ]
        },
        "count": 338
    },
    "result": {
        "value": 4
    }
}
```

The RPC handler simply pulls the function name from the POST request body, checks that it exists as a function in the globalThis object, executes it, and adds its return value to the output object:

```
import {} from './lib.js'; // globalThis.rpc_cmd = function rpc_cmd(){}

server.post( '/RPC', ( request, response ) => {

    let output = { report: get_request_report( request ) };
    if( typeof globalThis[ request.body.rpc ] === "function" )	{
        output.result = globalThis[ request.body.rpc ]( request.body );
    }
    else	{
        let msg = "RPC: function \'" + request.body.rpc + "\' NOT FOUND";
        output.result = { error: msg };
    }
    response.send( output );
});
```


## Testing the Console

The *Console* app requires an extra module to uniquely identify each client with UUID:

```
> npm install express-request-id
```

Multiple client instances can now see other public client names (simple integer id), using the *who* button:

```
response: {
    "report": {
        "method": "GET",
        "url": "/who",
        "path": "/who",
        "params": {},
        "query": {},
        "body": {},
        "count": 0
    },
    "clients": [ 0, 1, 2 ]
}
```

The server console has several commands to track clients and their long poll status, and a dummy push message which clients will report:

```
> who
{ id: 0, uuid: 'e39e3735-5827-492d-915b-f39ddeebccc5' }
{ id: 1, uuid: '3e0630ff-16e1-4db9-a0c6-942e06909046' }
{ id: 2, uuid: '6ffe4628-252c-4b42-b5ae-2ea7700f72b3' }

> poll
{ id: 0, uuid: 'e39e3735-5827-492d-915b-f39ddeebccc5' }
{ id: 2, uuid: '6ffe4628-252c-4b42-b5ae-2ea7700f72b3' }

> push
>
```




