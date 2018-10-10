#!/bin/sh
if [ -f /.dockerenv ]; then
  rabbitmq-server -detached;
  node /root/veranet/bin/veranet.js;
else
    echo "This script is intended to be run from within the veranet Docker container";
fi


