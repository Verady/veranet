The Veranet daemon can be controlled by another process on the same host or 
remotely via socket connection. By default, the daemon is configured to 
listen on a UNIX domain socket located at `$HOME/.config/veranet/veranet.sock` 
- see {@tutorial config} for details on how to change this or switch to using 
a TCP socket.

Once connected to the daemon, you may send it control commands to trigger 
network calls for performing audits as well as registering chain modules for 
the daemon to provide to the network.

The controller understands newline terminated JSON-RPC 2.0 payloads:

```
{"jsonrpc":"2.0","id":"{ID}","method":"{METHOD}","params":["{PARAM1}","{PARAM2}"]}\r\n
```

Controller API
--------------

### `PROTOCOL_INFO`

Returns general information about the running daemon. 

**Params:** `[]`  
**Result:** `{ versions: { software, protocol }, peers, identity, contact }`

### `CREATE_SNAPSHOT`

Creates a snapshot job and builds a verifier pool of workers and dispactches
the requests to the network. See {@link Node#createSnapshot}.

**Params:** `[{ pool, consistency, chain, query: [{ address, from, to }] } }]`  
**Result:** `[...[...{ transaction }]]`

### `REGISTER_MODULE`

Registers a chain module with the daemon and updates it's network status to 
accept work for that chain. Endpoint can be `unix:///path/to/domain.sock` or 
`tcp://hostname.or.ip:port` and speak the Chain Module API described below.

**Params:** `[chain, endpoint]`  
**Result:** `[]`

### `DEREGISTER_MODULE`

Deregisters the module associated with the given chain and updates the daemon's 
network status to no longer accept work for that chain.

**Params:** `[chain]`  
**Result:** `[]`

Chain Module API
----------------

TODO
