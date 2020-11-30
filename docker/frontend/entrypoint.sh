#!/bin/bash

envsubst < /var/www/config/settings.json.tmpl > /var/www/portal/settings.json
chown -R www-data:www-data /var/www/portal/

echo "Starting apache"
if [ -e /var/run/apache2/apache2.pid ]; then
    rm /var/run/apache2/apache2.pid
fi
apachectl -d /etc/apache2 -f apache2.conf -e info -DFOREGROUND
