#!/bin/sh
# Run on the VPS for initial SSL setup
# Requires: docker compose running with certbot service

DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@localhost}"

echo "Obtaining SSL certificate for $DOMAIN..."
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "Reloading nginx..."
docker compose exec frontend nginx -s reload
