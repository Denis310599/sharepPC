# Use Node 16 alpine as parent image
#FROM python:3.8-alpine
FROM python:3.8.3-slim

RUN apt-get update \
    && apt-get -y install libpq-dev gcc \
    && pip install psycopg2
	
#Instalo Nginx
RUN apt-get install -y nginx
	
RUN mkdir /src
WORKDIR /src
COPY ./nginx.conf /etc/nginx/nginx.conf
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

RUN chmod 777 ./run.sh


#Ejecutamos gunicorn
#RUN nginx
#RUN gunicorn -b :8000 app:app --preload
#CMD ["gunicorn", "-b", ":8000", "app:app", "--preload"]
#CMD ["nginx;", "flask", "run", "--host=0.0.0.0", "--port=80"]
CMD /bin/bash ./run.sh