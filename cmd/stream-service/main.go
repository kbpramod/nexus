package main

import (
	"fmt"
	"log"

	"nexus/internal/config"
	"nexus/internal/redis"
	"nexus/internal/stream/services"
)

func main() {
	config.LoadEnv()

	if err := redis.Connect(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer redis.Close()

	services.StartStream()
	fmt.Println("🚀 Quote Stream Worker running...")
}