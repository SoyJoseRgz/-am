.PHONY: dev build up down deploy logs

dev:
	@echo "Starting dev servers..."
	npm run dev

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

deploy: build up
	@echo "Deploy complete"

ssl-init:
	@echo "Setting up Let's Encrypt for $(DOMAIN)..."
	docker compose run --rm certbot certonly --webroot \
		--webroot-path=/var/www/certbot \
		--email $(EMAIL) \
		--agree-tos \
		--no-eff-email \
		-d $(DOMAIN)

ssl-renew:
	docker compose run --rm certbot renew
