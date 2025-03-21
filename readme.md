# Transcendence

## Requirements

- Docker + Docker Compose
- GNU Make
- Python >= 3.10

## Development

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/Sandoramix/42-transcendence.git
   ```
2. Configure the global environment variables
	1. ```bash
       cp .env.example .env
       ```
	2. Set the values of the environment variables in `.env`
		1. `SIGNING_KEY` - a random string used for signing JWT tokens, it must be the same for all services as it is
		   in the root [`.env`](.env.example) file
3. Install Python dependencies and configure environment variables
	1. Install Python dependencies
		```bash
		make development-init
		```
	2. Configure environment variables by editing `.env` in each service's directory in [src](src)/* (the Makefile will
   create it for you by copying `.env.example`)
		1. `SIGNING_KEY` - a random string used for signing JWT tokens, it must be the same for all services as it is
		   in the root [`.env`](.env.example) file

### Running

1. Start The database and Redis containers
   ```bash
   make up-detach-postgres_db up-detach-redis
   ```
2. Start the backend microservices. Each service has it's own `start.sh` script. You can run it with
   `make dev-start-<service_folder_name>`
	1. Matchmaking
	   ```bash
	   make dev-start-matchmaking
	   ```
	2. Pong Game
	   ```bash
	   make dev-start-pong_game
	   ```
	3. User Management
	   ```bash
	   make dev-start-user_management
	   ```
