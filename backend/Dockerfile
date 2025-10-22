FROM docker.io/python:latest

WORKDIR /backend

RUN apt-get update

COPY requirements.txt .

RUN pip3 install -r requirements.txt
