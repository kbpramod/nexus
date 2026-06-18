package rabbitmq

import (
	"context"

	"github.com/rabbitmq/amqp091-go"
)

const OrderQueue = "order.execute"

func Publish(body []byte) error {

	_, err := Channel.QueueDeclare(
		OrderQueue,
		true,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		return err
	}

	return Channel.PublishWithContext(
		context.Background(),
		"",
		OrderQueue,
		false,
		false,
		amqp091.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}