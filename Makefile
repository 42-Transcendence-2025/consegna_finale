PROJECT_NAME := transcendence

DCOMPOSE := $(shell if command -v docker-compose > /dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi) -p $(PROJECT_NAME)

all: up-detach

up:
	$(DCOMPOSE) up

up-detach:
	$(DCOMPOSE) up -d
up-detach-%:
	$(DCOMPOSE) up -d $*

stop:
	$(DCOMPOSE) stop

logs:
	$(DCOMPOSE) logs

logs-%:
	$(DCOMPOSE) logs $*

exec-%:
	$(DCOMPOSE) exec $* /bin/sh

up-build:
	$(DCOMPOSE) up --build
down:
	$(DCOMPOSE) down

#------------------------------------------------------------------------------

clean:
	$(DCOMPOSE) down --rmi all -v --remove-orphans

fclean: clean rm-venvs

# DEVELOPMENT-----------------------------------------------------------------------------------------------------------

_SERVICES = src/matchmaking src/pong_game src/user_management
_DEV_VENVS := $(addsuffix /venv, $(_SERVICES))

dev-sh-%:
	$(DCOMPOSE) exec $* /bin/sh

PYTHON := python3.10
define CHECK_PYTHON_VERSION
	@$(PYTHON) -c 'import sys; ver=sys.version_info; exit(1) if ver < (3,10) else exit(0)' || \
	(echo "Python 3.10 or higher is required.\nFound version $$($(PYTHON) -V)" && exit 1)
endef
check-python:
	$(call CHECK_PYTHON_VERSION)

#README: to init all python venvs use this
development-init: check-python $(_DEV_VENVS)
development-rebuild-venvs: check-python rm-venvs $(_DEV_VENVS)

$(_DEV_VENVS): %/venv:
	cd $* && $(PYTHON) -m venv venv
	cd $* && ./venv/bin/pip3 install --upgrade pip setuptools wheel
	cd $* && ./venv/bin/pip3 install -r requirements.txt
	cd $* && cp .env.example .env

dev-start-%:
	cd src/$* && ./start.sh

rm-venvs:
	rm -rf $(_DEV_VENVS)

# UNIVERSAL RULE FOR RUNNING ANY DOCKER COMPOSE COMMAND. E.G. make d-ps -> docker-compose -p transcendence ps
d-%:
	$(DCOMPOSE) $*

.PHONY:
