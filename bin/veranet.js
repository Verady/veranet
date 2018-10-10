#!/usr/bin/env node

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const assert = require('assert');
const async = require('async');
const program = require('commander');
const hdkey = require('hdkey');
const kadence = require('@kadenceproject/kadence');
const bunyan = require('bunyan');
const RotatingLogStream = require('bunyan-rotating-file-stream');
const fs = require('fs');
const path = require('path');
const veranet = require('../index');
const options = require('./config');
const npid = require('npid');
const daemon = require('daemon');
const pem = require('pem');
const net = require('net');
const levelup = require('levelup');
const leveldown = require('leveldown');
const encoding = require('encoding-down');
const boscar = require('boscar');


program.version(`
  veranet  ${veranet.version.software}
  protocol ${veranet.version.protocol}
`);

program.description(`
  Copyright (c) 2018 Verady, LLC
  Licensed under the GNU Affero General Public License Version 3
`);

program.option('--config <file>', 'path to a veranet configuration file');
program.option('--datadir <path>', 'path to the default data directory');
program.option('--shutdown', 'sends the shutdown signal to the daemon');
program.option('--daemon', 'sends the veranet daemon to the background');
program.parse(process.argv);

let argv;

if (program.datadir && !program.config) {
  argv = { config: path.join(program.datadir, 'config') };
}

const config = require('rc')('veranet', options(program.datadir), argv);

let xprivkey, parentkey, childkey, identity, logger, controller, node;

// Generate a private extended key if it does not exist
if (!fs.existsSync(config.PrivateExtendedKeyPath)) {
  fs.writeFileSync(
    config.PrivateExtendedKeyPath,
    kadence.utils.toHDKeyFromSeed().privateExtendedKey
  );
}

// Handle certificate generation
function _generateSelfSignedCertificate() {
  return new Promise((resolve, reject) => {
    pem.createCertificate({
      days: 365,
      selfSigned: true
    }, (err, keys) => {
      if (err) {
        return reject(err);
      }

      fs.writeFileSync(config.SSLKeyPath, keys.serviceKey);
      fs.writeFileSync(config.SSLCertificatePath, keys.certificate);
      resolve();
    });
  });
}

async function _init() {
  // Initialize private extended key
  xprivkey = fs.readFileSync(config.PrivateExtendedKeyPath).toString();
  parentkey = hdkey.fromExtendedKey(xprivkey);
  childkey = parentkey
    .derive(veranet.constants.HD_KEY_DERIVATION_PATH)
    .deriveChild(parseInt(config.ChildDerivationIndex));
  identity = kadence.utils.toPublicKeyHash(childkey.publicKey)
    .toString('hex');

  // Initialize logging
  logger = bunyan.createLogger({
    name: identity,
    streams: [
      {
        stream: new RotatingLogStream({
          path: config.LogFilePath,
          totalFiles: parseInt(config.LogFileMaxBackCopies),
          rotateExisting: true,
          gzip: false
        })
      },
      { stream: process.stdout }
    ],
    level: parseInt(config.VerboseLoggingEnabled) ? 'debug' : 'info'
  });

  if (!fs.existsSync(config.SSLKeyPath)) {
    await _generateSelfSignedCertificate();
  }

  if (program.shutdown) {
    try {
      process.kill(parseInt(
        fs.readFileSync(config.DaemonPidFilePath).toString().trim()
      ), 'SIGTERM');
    } catch (err) {
      logger.error('failed to shutdown daemon, is it running?');
      process.exit(1);
    }
    process.exit();
  }

  if (program.daemon) {
    require('daemon')({ cwd: process.cwd() });
  }

  try {
    npid.create(config.DaemonPidFilePath).removeOnExit();
  } catch (err) {
    logger.error('Failed to create PID file, is veranet already running?');
    process.exit(1);
  }

  // Shutdown children cleanly on exit
  process.on('exit', killChildrenAndExit);
  process.on('SIGTERM', killChildrenAndExit);
  process.on('SIGINT', killChildrenAndExit);
  process.on('uncaughtException', (err) => {
    npid.remove(config.DaemonPidFilePath);
    logger.error(err.message);
    logger.debug(err.stack);
    process.exit(1);
  });

  init();
}

function killChildrenAndExit() {
  logger.info('exiting, killing child services, cleaning up');
  npid.remove(config.DaemonPidFilePath);
  process.removeListener('exit', killChildrenAndExit);

  if (controller && parseInt(config.ControlSockEnabled)) {
    controller.server.close();
  }

  process.exit(0);
}

function registerControlInterface() {
  assert(!(parseInt(config.ControlPortEnabled) &&
           parseInt(config.ControlSockEnabled)),
  'ControlSock and ControlPort cannot both be enabled');

  controller = new boscar.Server({
    INFO: function(callback) {
      logger.info('received INFO request via controller');

      const peers = [], dump = node.router.getClosestContactsToKey(identity,
        kadence.constants.K * kadence.constants.B);

      for (let peer of dump) {
        peers.push(peer);
      }

      callback(null, {
        versions: veranet.version,
        identity: identity.toString('hex'),
        contact: node.contact,
        peers
      });
    }
  });

  if (parseInt(config.ControlPortEnabled)) {
    logger.info('binding controller to port ' + config.ControlPort);
    controller.listen(parseInt(config.ControlPort), '0.0.0.0');
  }

  if (parseInt(config.ControlSockEnabled)) {
    logger.info('binding controller to path ' + config.ControlSock);
    controller.listen(config.ControlSock);
  }
}

function init() {
  logger.info('initializing veranet node');

  // Initialize public contact data
  const contact = {
    hostname: config.NodePublicAddress,
    protocol: 'https:',
    port: parseInt(config.NodePublicPort),
    xpub: parentkey.publicExtendedKey,
    index: parseInt(config.ChildDerivationIndex),
    agent: veranet.version.protocol,
    amqp: config.PublicQueueURI,
    chains: config.ChainCodes,
  };
  const key = fs.readFileSync(config.SSLKeyPath);
  const cert = fs.readFileSync(config.SSLCertificatePath);
  const ca = config.SSLAuthorityPaths.map(fs.readFileSync);

  // Initialize transport adapter
  const transport = new kadence.HTTPSTransport({ key, cert, ca });

  // Initialize protocol implementation
  node = new veranet.VeranetNode({
    logger,
    transport,
    contact,
    privateExtendedKey: xprivkey,
    keyDerivationIndex: parseInt(config.ChildDerivationIndex),
    peerCacheFilePath: config.EmbeddedPeerCachePath,
    storage: levelup(encoding(leveldown(config.EmbeddedDatabaseDirectory)))
  });

  // Punch through NATs
  if (!!parseInt(config.TraverseNatEnabled)) {
    node.traverse = node.plugin(kadence.traverse([
      new kadence.traverse.UPNPStrategy({
        mappingTtl: parseInt(config.TraversePortForwardTTL),
        publicPort: parseInt(node.contact.port)
      }),
      new kadence.traverse.NATPMPStrategy({
        mappingTtl: parseInt(config.TraversePortForwardTTL),
        publicPort: parseInt(node.contact.port)
      }),
      new kadence.traverse.ReverseTunnelStrategy({
        remoteAddress: config.TraverseReverseTunnelHostname,
        remotePort: parseInt(config.TraverseReverseTunnelPort),
        privateKey: node.spartacus.privateKey,
        secureLocalConnection: true,
        verboseLogging: parseInt(config.VerboseLoggingEnabled)
      })
    ]));
  }

  // Handle any fatal errors
  node.on('error', (err) => {
    logger.error(err.message.toLowerCase());
  });

  // Use verbose logging if enabled
  if (!!parseInt(config.VerboseLoggingEnabled)) {
    node.rpc.deserializer.append(new kadence.logger.IncomingMessage(logger));
    node.rpc.serializer.prepend(new kadence.logger.OutgoingMessage(logger));
  }

  // Cast network nodes to an array
  if (typeof config.NetworkBootstrapNodes === 'string') {
    config.NetworkBootstrapNodes = config.NetworkBootstrapNodes.trim().split();
  }

  async function joinNetwork(callback) {
    let peers = config.NetworkBootstrapNodes.concat(
      await node.rolodex.getBootstrapCandidates()
    );

    if (peers.length === 0) {
      logger.info('no bootstrap seeds provided and no known profiles');
      logger.info('running in seed mode (waiting for connections)');

      return node.router.events.once('add', (identity) => {
        config.NetworkBootstrapNodes = [
          veranet.utils.getContactURL([
            identity,
            node.router.getContactByNodeId(identity)
          ])
        ];
        joinNetwork(callback)
      });
    }

    logger.info(`joining network from ${peers.length} seeds`);
    async.detectSeries(peers, (url, done) => {
      const contact = veranet.utils.parseContactURL(url);
      node.join(contact, (err) => {
        done(null, (err ? false : true) && node.router.size > 1);
      });
    }, (err, result) => {
      if (!result) {
        logger.error('failed to join network, will retry in 1 minute');
        callback(new Error('Failed to join network'));
      } else {
        callback(null, entry);
      }
    });
  }

  node.listen(parseInt(config.NodeListenPort), () => {
    logger.info(
      `node listening on local port ${config.NodeListenPort} ` +
      `and exposed at https://${node.contact.hostname}:${node.contact.port}`
    );
    registerControlInterface();
    async.retry({
      times: Infinity,
      interval: 60000
    }, done => joinNetwork(done), (err, entry) => {
      if (err) {
        logger.error(err.message);
        process.exit(1);
      }

      logger.info(
        `connected to network via ${entry} ` +
        `(http://${entry[1].hostname}:${entry[1].port})`
      );
      logger.info(`discovered ${node.router.size} peers from seed`);
    });
  });
}

_init();
