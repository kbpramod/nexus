package main

import (
	"log"

	"nexus/internal/config"
	"nexus/internal/db"
	"nexus/internal/rabbitmq"
	"nexus/internal/redis"
	"nexus/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables
	config.LoadEnv()

	// Connect PostgreSQL
	if err := db.Connect(); err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	defer db.Close()

	// Connect Redis
	if err := redis.Connect(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer redis.Close()

	// Connect RabbitMQ
	if err := rabbitmq.Connect(); err != nil {
		log.Fatalf("failed to connect to rabbitmq: %v", err)
	}
	defer rabbitmq.Close()

	// Create Gin router
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:5173"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	// Register all routes
	routes.RegisterRoutes(router)

	// Start server
	port := config.Env.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 API running on :%s", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}