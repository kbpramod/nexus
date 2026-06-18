package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"

	"nexus/internal/config"
)

var DB *sql.DB

func Connect() error {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		config.Env.PostgresHost,
		config.Env.PostgresPort,
		config.Env.PostgresUser,
		config.Env.PostgresPassword,
		config.Env.PostgresDB,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return err
	}

	// Verify the connection
	if err := db.Ping(); err != nil {
		return err
	}

	// Connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)

	DB = db

	log.Println("✅ Connected to PostgreSQL")

	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}