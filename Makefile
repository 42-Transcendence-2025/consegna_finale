DCOMPOSE = $(shell if command -v docker-compose > /dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

all: up-detach

up:
	$(DCOMPOSE) up

up-detach:
	$(DCOMPOSE) up -d

up-build:
	$(DCOMPOSE) up --build

down:
	$(DCOMPOSE) down

down-clean:
	$(DCOMPOSE) down --rmi all -v --remove-orphans

logs:
	$(DCOMPOSE) logs

logs-%:
	$(DCOMPOSE) logs $*

exec-%:
	$(DCOMPOSE) exec $* /bin/sh

.PHONY: