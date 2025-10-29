.PHONY: db-init db-start db-stop db-reset db-migrate help

# Initialize Supabase database
db-init:
	npx supabase init

# Start Supabase database locally
db-start:
	npx supabase start

# Stop Supabase database
db-stop:
	npx supabase stop

# Reset database (stop, remove, and restart)
db-reset:
	npx supabase db reset

# Run pending migrations
db-migrate:
	npx supabase migration up

db-gen-types:
	mkdir -p src/db
	npx supabase gen types typescript --local > src/db/database.types.ts

# Show available commands
help:
	@echo "Available commands:"
	@echo "  make db-init    - Initialize Supabase project"
	@echo "  make db-start   - Start Supabase database locally"
	@echo "  make db-stop    - Stop Supabase database"
	@echo "  make db-reset   - Reset database to initial state"
	@echo "  make db-migrate - Run pending migrations"
	@echo "  make help       - Show this help message"
