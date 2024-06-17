# Use Node 16 alpine as parent image
#FROM python:3.8-alpine
FROM python:3.8.3-slim

RUN apt-get update \
    && apt-get -y install libpq-dev gcc \
    && pip install psycopg2
	
RUN mkdir /src
WORKDIR /src

#Instalo python
#RUN apk add --no-cache py3-pip

#Copio los archivos
WORKDIR /app
COPY ./* ./

#Instalo los requirements
#RUN pip install -r requirements.txt
RUN pip3 install kubernetes
RUN pip3 install flask
RUN pip3 install psycopg2
#Instalamos gunicorn
RUN pip install gunicorn

#Ejecutamos gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]