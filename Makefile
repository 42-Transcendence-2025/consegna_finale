DCOMPOSE = $(shell if command -v docker-compose > /dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

VENVS_DIR = venvs
VENVS = $(VENVS_DIR)/matchmaking $(VENVS_DIR)/pong_game $(VENVS_DIR)/user_management

all: up-detach

up: create-venvs-dirs
	$(DCOMPOSE) up

up-detach: create-venvs-dirs
	$(DCOMPOSE) up -d

up-build: create-venvs-dirs
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

create-venvs-dirs:
	mkdir -p $(VENVS)

.PHONY: