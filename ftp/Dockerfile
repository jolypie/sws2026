FROM alpine:3.19

RUN apk add --no-cache pure-ftpd shadow postgresql-client

COPY run.sh /run.sh
COPY sync.sh /sync.sh
RUN chmod +x /run.sh /sync.sh

EXPOSE 21 30000-30009

CMD ["/run.sh"]
