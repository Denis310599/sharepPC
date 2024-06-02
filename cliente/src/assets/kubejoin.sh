#!/bin/bash

#Copio el fichero de las interfaces
sudo cp /vagrant/ipConfig.yaml /etc/netplan/01-netcfg.yaml
#Actualizo la configuracion de red
sudo netplan apply
#sudo ip route add default via 10.0.0.1 dev enp0s3

#Configuro la nueva IP en kubelet
cat > /etc/default/kubelet << EOF
KUBELET_EXTRA_ARGS=--node-ip=10.0.0.0
EOF

#Reinicio el kubeadm
sudo kubeadm reset -f
#sudo rm -rf /etc/cni/net.d

#Comando para kubejoin
