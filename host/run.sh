#!/bin/bash

# Inicia el servidor de pantalla
Xvfb :99 -screen 0 1920x1080x24 &
#Xephyr -screen 1920x1080 :99
export DISPLAY=:99

#/usr/bin/x11vnc -display :0 &

#xrandr –query
sleep 5
nohup startxfce4 &


# Inicia el entorno de escritorio
#openbox &

# Inicia la aplicación deseada
cd /usr/test
npm run start 


#export DISLPAY=:99
#Xvfb :99 -screen 0 1600x900x8 &#-nolisten tcp -nolisten unix &

#echo "Xvfb en ejecución"
#Xvfb :100 -screen 0 640x480x8 -nolisten tcp -nolisten unix &
#cd /usr/shared/webrtc_linux
#npm run start


