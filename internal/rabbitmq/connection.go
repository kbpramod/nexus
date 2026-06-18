package rabbitmq

import (
	"log"

	"github.com/rabbitmq/amqp091-go"

	"nexus/internal/config"
)

var Conn *amqp091.Connection
var Channel *amqp091.Channel

func Connect() error {
	var err error

	Conn, err = amqp091.Dial(config.Env.RabbitMQURL)
	if err != nil {
		return err
	}

	Channel, err = Conn.Channel()
	if err != nil {
		return err
	}

	log.Println("✅ Connected to RabbitMQ")

	return nil
}

func Close() {
	if Channel != nil {
		Channel.Close()
	}

	if Conn != nil {
		Conn.Close()
	}
}