'use strict';

const ini = require('ini');
const { existsSync, writeFileSync } = require('fs');
const mkdirp = require('mkdirp');
const { tmpdir, homedir } = require('os');
const { join } = require('path');

const DEFAULT_DATADIR = join(homedir(), '.config/veranet');

module.exports = function(datadir) {

  datadir = datadir || DEFAULT_DATADIR;

  const options = {

    // Process PID
    DaemonPidFilePath: join(datadir, 'veranet.pid'),

    // Identity/Cryptography
    PrivateExtendedKeyPath: join(datadir, 'veranet.prv'),
    ChildDerivationIndex: '0',

    // Database
    EmbeddedDatabaseDirectory: join(datadir, 'veranet.dat'),
    EmbeddedPeerCachePath: join(datadir, 'peercache'),

    // Node Options
    NodePublicPort: '8372',
    NodeListenPort: '8372',
    NodePublicAddress: '127.0.0.1',
    NodeListenAddress: '0.0.0.0',

    // SSL Certificate
    SSLCertificatePath: join(datadir, 'veranet.crt'),
    SSLKeyPath: join(datadir, 'veranet.key'),
    SSLAuthorityPaths: [

    ],

    // Network Bootstrapping
    NetworkBootstrapNodes: [

    ],

    // Debugging/Developer
    VerboseLoggingEnabled: '1',
    LogFilePath: join(datadir, 'veranet.log'),
    LogFileMaxBackCopies: '3',

    // Local Control Protocol
    ControlPortEnabled: '0',
    ControlPort: '8373',
    ControlSockEnabled: '1',
    ControlSock: join(datadir, 'veranet.sock')

  };

  if (!existsSync(join(datadir, 'config'))) {
    mkdirp.sync(datadir);
    writeFileSync(join(datadir, 'config'), ini.stringify(options));
  }

  if (!existsSync(join(datadir, 'veranet.dat'))) {
    mkdirp.sync(join(datadir, 'veranet.dat'));
  }

  return options;
};
