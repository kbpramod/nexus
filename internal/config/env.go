package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Environment struct {
	// App
	Port string

	// PostgreSQL
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string

	// Redis
	RedisHost string
	RedisPort string
	RedisPassword string

	// RabbitMQ
	RabbitMQURL string

	// Binance
	BinanceAPIKey    string
	BinanceSecretKey string
	BinanceBaseURL   string
}

var Env Environment

func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  .env file not found, using system environment variables")
	}

	Env = Environment{
		Port: os.Getenv("PORT"),

		PostgresHost:     os.Getenv("POSTGRES_HOST"),
		PostgresPort:     os.Getenv("POSTGRES_PORT"),
		PostgresUser:     os.Getenv("POSTGRES_USER"),
		PostgresPassword: os.Getenv("POSTGRES_PASSWORD"),
		PostgresDB:       os.Getenv("POSTGRES_DB"),

		RedisHost: os.Getenv("REDIS_HOST"),
		RedisPort: os.Getenv("REDIS_PORT"),

		RabbitMQURL: os.Getenv("RABBITMQ_URL"),

		BinanceAPIKey:    os.Getenv("BINANCE_API_KEY"),
		BinanceSecretKey: os.Getenv("BINANCE_SECRET_KEY"),
		BinanceBaseURL:   os.Getenv("BINANCE_BASE_URL"),
	}
}