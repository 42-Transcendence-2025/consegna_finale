DCOMPOSE = $(shell if command -v docker-compose > /dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

all: up-detach

up:
	$(DCOMPOSE) up

up-detach:
	$(DCOMPOSE) up -d

down:
	$(DCOMPOSE) down

build:
	$(DCOMPOSE) build

clean:
	$(DCOMPOSE) rm -f

remove-volumes:
	$(DCOMPOSE) down --volumes

restart: down up

logs:
	$(DCOMPOSE) logs

logs-%:
	$(DCOMPOSE) logs $*

exec-%:
	$(DCOMPOSE) exec $* /bin/sh

restart-%:
	$(DCOMPOSE) restart $*

.PHONY: up up-detach down build clean remove-volumes restart logs exec-% restart-%