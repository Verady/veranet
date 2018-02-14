The Veranet daemon can be controlled by another process on the same host or 
remotely via socket connection. By default, the daemon is configured to 
listen on a UNIX domain socket located at `$HOME/.config/veranet/veranet.sock`.
See {@tutorial config} for details on how to change this or switch to using 
a TCP socket.

Once connected to the daemon, you may send it control commands to trigger 
network calls for performing audits as well as registering chain modules for 
the daemon to provide to the network.

The controller understands newline terminated JSON-RPC 2.0 payloads:

```
{"jsonrpc":"2.0","id":"{ID}","method":"{METHOD}","params":["{PARAM1}","{PARAM2}"]}\r\n
```

### Controller API

#### `PROTOCOL_INFO`

Returns general information about the running daemon. 

**Params:** `[]`  
**Result:** `{ versions: { software, protocol }, peers, identity, contact }`

#### `CREATE_SNAPSHOT`

Creates a snapshot job and builds a verifier pool of workers and dispactches
the requests to the network. See {@link Node#createSnapshot}.

**Params:** `[{ pool, consistency, chain, query: [{ address, from, to }] } }]`  
**Result:** `[...[...{ transaction }]]`

#### `REGISTER_MODULE`

Registers a chain module with the daemon and updates it's network status to 
accept work for that chain. Endpoint can be `unix:///path/to/domain.sock` or 
`tcp://hostname.or.ip:port` and speak the Chain Module API described below.

**Params:** `[chain, endpoint]`  
**Result:** `[]`

#### `DEREGISTER_MODULE`

Deregisters the module associated with the given chain and updates the daemon's 
network status to no longer accept work for that chain.

**Params:** `[chain]`  
**Result:** `[]`

### Chain Module API

Chain module are the "glue" that connect the Veranet daemon to any number of 
different blockchains. In reality, the Veranet daemon is only responsible for
coordinating hosts running various chain modules and exposing a ubiquitous 
interface for interacting with them.

Chain modules are also expected to speak newline terminated JSON-RPC 2.0 
payloads. At the time of writing, chain modules are only required to implement 
a single method.

#### `AUDIT_SELECTION`

Accepts a list of addresses and timeframes and must return the complete 
transaction history for each address between the given timeframes. The 
returned results must be in the form of a two-dimensional list where each 
child list is placed in the position of it's original query and contains 
well-formatted transaction objects (see {@tutorial protocol}).

**Params:** `[[...{ address, from, to }]]`  
**Result:** `[[...[...{ transaction }]]]`

Example of a chain module implemented in Node.js, using the `boscar` package:

```js
// Import the BOSCAR package to handle communication
const boscar = require('boscar');

// Create our BOSCAR server to handle work requests from the Veranet daemon
const server = new boscar.Server({
  AUDIT_SELECTION: function(selection, callback) {
    async.map(selection, (query, done) => {
      // Query contains { address, to, from }
      getTxHistoryInCorrectFormat(query, done);
    }, callback);
  }
});

// Start listening on a domain socket
server.listen('/tmp/btcchainmod.sock');

// Create a BOSCAR client to connect to the Veranet daemon
const client = new boscar.Client();

// Connect to the controller
client.connect('path/to/veranet.sock');

// When connected, register our module and disconnect from the controller
client.on('ready', () => {
  client.invoke('REGISTER_MODULE', ['BTC', 'unix:///tmp/btcchainmod.sock'], () => {
    client.socket.close();
  });
});
```

> Note that while this example, connects to the Veranet daemon and registers
> itself, this is not a requirement - any program with access to the controller 
> may register any chain module.
