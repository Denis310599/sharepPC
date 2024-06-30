#!/bin/sh

service auditd start

#Inicio el servidor sshd
/usr/sbin/sshd

#Inicio la aplicación
sudo -H -u share bash -c 'node /usr/test/src/app.js';