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

#### `INFO`

Returns general information about the running daemon. 

**Params:** `[]`  
**Result:** `{ versions: { software, protocol }, peers, identity, contact }`
