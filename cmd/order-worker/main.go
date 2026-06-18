package main

import (
	"log"

	"nexus/internal/config"
	"nexus/internal/db"
	"nexus/internal/rabbitmq"
	"nexus/internal/workers"
)

func main() {
	config.LoadEnv()

	if err := db.Connect(); err != nil {
		log.Fatal(err)
	}

	if err := rabbitmq.Connect(); err != nil {
		log.Fatal(err)
	}

	msgs, err := rabbitmq.Consume()
	if err != nil {
		log.Fatal(err)
	}

	workers.StartOrderWorker(msgs)
}