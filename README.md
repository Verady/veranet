---

Veranet is a decentralized platform for multi-currency blockchain accounting. 

[![Build Status](https://img.shields.io/travis/verady/veranet.svg?style=flat-square)](https://travis-ci.org/verady/veranet) | 
[![Test Coverage](https://img.shields.io/coveralls/verady/veranet.svg?style=flat-square)](https://coveralls.io/r/verady/veranet) | 
[![Node Package](https://img.shields.io/npm/v/@verady/veranet.svg?style=flat-square)](https://www.npmjs.com/package/@verady/veranet) | 
[![Docker Hub](https://img.shields.io/docker/pulls/verady/veranet.svg?style=flat-square)](https://hub.docker.com/r/verady/veranet) | 
[![License (AGPL-3.0)](https://img.shields.io/badge/license-AGPL3.0-blue.svg?style=flat-square)](https://raw.githubusercontent.com/verady/veranet/master/LICENSE)

### Installation

Pull the [image from Docker Hub](https://hub.docker.com/r/verady/veranet).

```
docker pull verady/veranet
```

Create a data directory on the host.

```
mkdir ~/.config/veranet
```

If you are running Veranet for the first time, mount the data directory and run 
it normally.

```
docker run --volume ~/.config/veranet:/root/.config/veranet verady/veranet
```

This will generate a fresh configuration and setup the data directory. Modify 
the created configuration at `~/.config/veranet/config` as desired (see the 
{@tutorial config}) and send `SIGINT` to the process (`Ctrl+C`).
 
Once you are finished, run the Veranet container again, but expose the RPC to the 
host, mount the data directory, allocate a pseudo TTY, detach the process, and 
tell docker to keep it running (even starting automatically on system boot).

```
docker run \
  --publish 8372:8372 \
  --volume ~/.config/veranet:/root/.config/veranet \
  --restart always \
  --tty --detach verady/veranet
```

Once the container has started, you can use use the guide for {@tutorial api} 
to interact with it! You can watch your logs with 
`tail -f ~/.config/veranet/veranet.log`.

See the [`docker run` documentation](https://docs.docker.com/engine/reference/commandline/run/) 
for more information. If you prefer to install Veranet manually, see the guide for 
{@tutorial install}. Once installed, simply run `veranet` with an optional 
configuration file using the `--config <path/to/config>` option.

#### Automatic Security Updates

When running the Veranet server installation with Docker, you can configure your 
node to periodically check for updates and automatically download the latest 
image and restart your node to make sure you are always running the latest 
stable release. Since you already have Docker installed, pull the 
image for [Watchtower](https://github.com/v2tec/watchtower) and run it.

```
docker pull v2tec/watchtower
docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock v2tec/watchtower
```

Now, Watchtower will check for the latest stable images for running containers 
and automatically update them.

### Development 

To hack on the Veranet project, clone this repository and use 
[Docker Compose](https://docs.docker.com/compose/):

```
git clone https://github.com/verady/veranet
cd veranet
docker-compose up --force-recreate --build
```

This will volume mount the the appropriate directories for development, and 
then boots up a Veranet node, binds port `8372` to the host and the control 
socket to `8373` for end-to-end testing. The development container does not 
persist state between runs. Note that stable releases are tagged and the 
`master` branch may contain unstable or bleeding-edge code.

### Resources

* [Documentation](https://verady.github.io/veranet/)
* [Specification](https://raw.githubusercontent.com/verady/protocol/master/PROTOCOL.md)

### License

Veranet - decentralized platform for multi-currency blockchain accounting  
Copyright (C) 2018  Verady, LLC  

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see
[http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).
