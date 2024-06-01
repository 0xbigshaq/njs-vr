FROM ubuntu:20.04

WORKDIR /exp-dev/
ADD exp.js .

ENV LC_CTYPE=C.UTF-8
ENV DEBIAN_FRONTEND=noninteractive

RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt install -y git python3-dev vim binutils gcc gdb wget unzip make libpcre3-dev zlib1g-dev libssl-dev libxml2-dev libxslt-dev
RUN wget https://github.com/nginx/njs/archive/bb3dcf21318391417ec43bde7195a768329c1240.zip -O njs-bb3dcf2.zip
RUN unzip njs-bb3dcf2.zip
RUN mv ./njs-bb3dcf21318391417ec43bde7195a768329c1240/ ./njs/
RUN cd ./njs/ && ./configure && make -j$(nproc) njs

CMD ["/bin/bash"]