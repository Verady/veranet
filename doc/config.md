This guide will show you how to get started with running `veranet`! A Veranet 
node requires a configuration file to get up and running. The path to this 
file is given to `orcd` when starting a node.

```
veranet --config path/to/config
```

If a configuration file is not supplied, a minimal default configuration is 
automatically created and used, which will generate a private extended key, 
storage for shards, contracts, and network information. All of this data will 
be created and stored in `$HOME/.config/veranet`, yielding a directory structure 
like this:

```
+- ~/.config/veranet
  + - veranet.prv   (Root/Parent HD identity key)
  + - config        (INI configuration file)
  + - veranet.log   (Daemon log file, rotated periodically)
  + - peercache     (Cache of known peers)
  + - /veranet.dat  (Directory containing network metadata and DHT entries)
```

The locations of all of these files is defined in your configuration file. 
Below is an complete outline of each valid configuration property name, it's 
behavior, and default value(s). Valid configuration files may be in either INI 
or JSON format.

#### DaemonPidFilePath

##### Default: `$HOME/.config/veranet/veranet.pid`

The location to write the PID file for the daemon.

#### PrivateExtendedKeyPath

##### Default: `$HOME/.config/veranet/veranet.prv`

Path to private extended key file to use for master identity.

#### ChildDerivationIndex

##### Default: `0`

The index for deriving this child node's identity. This allows you to run 
multiple nodes with the same private extended key. If your private extended 
key was converted from an old non-hierarchically-deterministic private key,
you must set the value to `-1`.

#### NodePublicPort

##### Default: `8372`

Sets the public port to advertise to others (useful if behind a load balancer).

#### NodeListenPort

##### Default: `8372`

Sets the local port to bind the node's network RPC service.

#### NodePublicAddress

##### Default: `127.0.0.1`

Sets the public address to advertise to others (useful if tunneling through 
VPN).

#### NodeListenAddress 

##### Default: `0.0.0.0`

Set the network address to bind the network RPC service.

#### SSLCertificatePath

##### Default: `$HOME/.config/veranet/veranet.crt`

Path to the SSL certificate to use. Automatically generated and self-signed by 
default.

#### SSLKeyPath

##### Default: `$HOME/.config/veranet/veranet.key`

Path to the SSL private key to use. Automatically generated and self-signed by 
default.

#### SSLAuthorityPaths[]

##### Default: ``

Path to the SSL authority chains to use. Optional.

#### ControlPortEnabled 

##### Default: `0`

Expose the daemon's controller interface via TCP socket.

#### ControlPort

##### Default: `8373`

If `ControlPortEnabled` is enabled, listen on this port.

#### ControlSockEnabled

##### Default: `1`

Expose the daemon's controller interface via UNIX domain socket.

#### ControlSock

##### Default: `$HOME/.config/veranet/veranet.sock`

If `ControlSockEnabled` is enabled, listen on this path.

#### EmbeddedDatabaseDirectory

##### Default: `$HOME/.config/veranet/veranet.dat`

Directory location to store network metadata, such as peers, DHT entries, etc.

#### EmbeddedPeerCachePath

##### Default: `$HOME/.config/veranet/peercache`

File path to store peer contact information for bootstrapping.

#### VerboseLoggingEnabled

##### Default: `1`

More detailed logging of messages sent and received. Useful for debugging.

#### LogFilePath

##### Default: `$HOME/.config/veranet/veranet.log`

Path to write the daemon's log file. Log file will rotate either every 24 hours 
or when it exceeds 10MB, whichever happens first.

#### LogFileMaxBackCopies

##### Default: `3`

Maximum number of rotated log files to keep.

#### NetworkBootstrapNodes[]

##### Default: ``

Add a map of network bootstrap nodes to this section to use for discovering 
other peers. Default configuration should come with a list of known and 
trusted contacts.

#### PublicQueueURI

##### Default: `amqp://localhost:5672`

Set the public AMQP URI for others to connect to your queue.

#### ChainCodes[]

##### Default: `BTC,ETH`

List of chain codes supported by the queue.
