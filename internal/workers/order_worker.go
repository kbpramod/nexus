package workers

import (
	"encoding/json"
	"log"

	"nexus/internal/exchanges/binance"
	"nexus/internal/models"
	"nexus/internal/orders"

	"github.com/rabbitmq/amqp091-go"
)

func StartOrderWorker(msgs <-chan amqp091.Delivery) {
	log.Println("🚀 Order Worker Started")

	for msg := range msgs {
		var order models.OrderRequest

		if err := json.Unmarshal(msg.Body, &order); err != nil {
			log.Println(err)
			msg.Nack(false, false)
			continue
		}

		log.Println(order)

		res, err := binance.PlaceOrder(order)
		if err != nil {
					log.Println(err)
					msg.Nack(false, true)
					continue
				}

		err = orders.UpdateOrder(
			res.InternalOrderID,
			res.Status,
			res.ExchangeOrderID,
			res.Fills[0].Price,
			res.ExecutedQuantity,
		)

		if err != nil {
			// Handle DB update error
			log.Println("error in updating database")
		}
		

		msg.Ack(false)
	}
}