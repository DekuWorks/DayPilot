# Setting up PostgreSQL for DayPilot

You need PostgreSQL running so the API and Prisma can use the database. Two options:

---

## Option A: Docker (recommended)

### 1. Start Docker

- **macOS:** Open **Docker Desktop** and wait until it says it’s running.
- **Windows:** Start **Docker Desktop**.
- **Linux:** Start Docker: `sudo systemctl start docker` (or your distro’s equivalent).

### 2. Create your `.env` file

From the repo root:

```bash
cp .env.example .env
```

This sets `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/daypilot"`, which matches the Docker setup below.

### 3. Start Postgres

From the repo root:

```bash
docker compose up -d
```

This starts a Postgres 16 container named `daypilot-db` on port 5432 with user `postgres`, password `postgres`, and database `daypilot`.

### 4. Run migrations

```bash
pnpm db:migrate
```

When prompted for a migration name, you can press Enter (or use `init` if it’s the first time). After this, the API can use the database.

### Useful commands

- **Stop Postgres:** `docker compose down`
- **Stop and remove data:** `docker compose down -v`
- **View logs:** `docker compose logs -f postgres`
- **Check it’s running:** `docker compose ps`

---

## Option B: Install PostgreSQL locally (no Docker)

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

Create the database and user (password `postgres`):

```bash
createuser -s postgres  # if needed
createdb -O postgres daypilot
# If your local user is different, set a password:
# psql postgres -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Windows

- Install from [PostgreSQL downloads](https://www.postgresql.org/download/windows/).
- During setup, set a password for the `postgres` user (e.g. `postgres`).
- Create a database named `daypilot` (e.g. with pgAdmin or `psql`).

### Linux (apt)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb daypilot
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Then

1. Copy env: `cp .env.example .env`
2. If your user/password/host/port differ, edit `.env` and set `DATABASE_URL` accordingly.
3. Run migrations: `pnpm db:migrate`

---

## Verify

- **Postgres is up:** `docker compose ps` (Docker) or `pg_isready -h localhost -p 5432` (local install).
- **Migrations applied:** `pnpm db:migrate` runs without errors and creates tables in the `daypilot` database.
- **API:** Start the API (`pnpm dev --filter @daypilot/api`); it will connect using `DATABASE_URL` from `.env`.
