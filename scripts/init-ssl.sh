#!/bin/sh
# Run on the VPS for initial SSL setup
# Requires: docker compose running with certbot service

DOMAIN="${DOMAIN:-miresto.app}"
EMAIL="${EMAIL:-admin@miresto.app}"

echo "Obtaining SSL certificate for $DOMAIN..."
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "Reloading nginx..."
docker compose exec frontend nginx -s reload
