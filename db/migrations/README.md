# Database Migrations

This folder contains incremental SQL migration scripts for the NovaHost database.

## What are migrations?

Migrations are SQL scripts that safely modify an existing database schema without wiping data.
Each migration is numbered and idempotent — you can run it multiple times without side effects.

Unlike `init.sql` (which only runs on a **fresh** database volume), migrations are applied
manually to an already-running database.

## When to use a migration vs init.sql

| Scenario | What to use |
|----------|-------------|
| Fresh install from scratch | `init.sql` is applied automatically by Docker |
| Existing database needs schema changes | Run the relevant migration script manually |

## How to run a migration

```bash
# Copy the migration file into the running db container
docker compose cp db/migrations/001_jwt_multi_domain.sql db:/tmp/migrate.sql

# Execute it against the database
docker compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /tmp/migrate.sql
```

Replace `${POSTGRES_USER}` and `${POSTGRES_DB}` with the values from your `.env` file,
or run it directly if your shell has those variables set.

## Migration history

| File | Description |
|------|-------------|
| `001_jwt_multi_domain.sql` | Introduces `domains` table, moves domain out of `users`, adds `user_id` to `ftp_users`. Required for JWT auth and multi-domain support. |
