#!/bin/bash

comando=$(kubeadm token create --print-join-command)
echo -n "[$(date +'%Y-%m-%d %T')] " >> /root/logKubejoin.txt
echo $comando >> /root/logKubejoin.txt
curl -X POST -H 'Content-Type: application/json' -d '{"action": "updateKubejoin", "token": "Tk-17137gbpaxswfyyifdcddjwpo99354", "comando": "'"${comando}"'"}' https://hqna10txtk.execute-api.eu-west-3.amazonaws.com/Test/contenedor