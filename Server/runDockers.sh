#!/bin/bash

#API
docker run -it -d -p 91:8000 -e HOST_API="gusydenis.duckdns.org" -e PORT_API=91 -e HOST_WS="gusydenis.duckdns.org" -e PORT_WS=28000 -e HOST_TURN="gusydenis.duckdns.org" -e PORT_TURN=3478 -e USER_TURN="sharepc" -e PASS_TURN="sharepc1" --name share_api share_api

#Señalizacion
docker run -it -d -e HOST_API="gusydenis.duckdns.org" -e PORT_API=91 -e PATH_API="/Test/ws" -e PORT_WS=28000 --name signaling signaling

#Coturn
docker run -d --network=host -v $(pwd)/turnserver.confg:/etc/coturn/turnserver.conf --name coturn coturn/coturn

#Hosts
docker run -it -d -e HOST_API="gusydenis.duckdns.org" -e PORT_API=91 -e HOST_WS="gusydenis.duckdns.org" -e PORT_WS=28000 -e HOST_TURN="gusydenis.duckdns.org" -e PORT_TURN=3478 -e USER_TURN="sharepc" -e PASS_TURN="sharepc1" --name <container> <image>