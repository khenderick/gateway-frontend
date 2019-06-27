FROM ubuntu:16.04

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y apache2 less nano gettext

RUN echo "SetEnvIf X-Forwarded-Proto https HTTPS=1" >> /etc/apache2/apache2.conf && \
    rm /etc/apache2/sites-enabled/000-default.conf /etc/apache2/sites-available/000-default.conf && \
    ln -s /etc/apache2/sites-available/portal.conf /etc/apache2/sites-enabled/portal.conf && \
    sed -i 's/Listen 80/Listen 83/' /etc/apache2/ports.conf

COPY entrypoint.sh /entrypoint.sh
COPY portal.conf /etc/apache2/sites-available/portal.conf

COPY dist.tgz /dist.tgz
RUN cd / && \
    mkdir dist && tar xzf dist.tgz -C dist && \
    mv dist /var/www/portal && \
    rm dist.tgz

CMD [ "/entrypoint.sh" ]

EXPOSE 83
