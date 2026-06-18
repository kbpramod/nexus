package rabbitmq

import "github.com/rabbitmq/amqp091-go"

func Consume() (<-chan amqp091.Delivery, error) {

	_, err := Channel.QueueDeclare(
		OrderQueue,
		true,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		return nil, err
	}

	return Channel.Consume(
		OrderQueue,
		"",
		false, // manual ACK
		false,
		false,
		false,
		nil,
	)
}