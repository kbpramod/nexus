package orders

import (
	"encoding/json"
	"fmt"

	"nexus/internal/db"
	"nexus/internal/models"
	"nexus/internal/rabbitmq"
)

func PlaceOrder(req models.OrderRequest) (int64, error) {
	// 1. Save order to PostgreSQL
	query := `
		INSERT INTO orders (
			symbol,
			side,
			type,
			quantity,
			status
		)
		VALUES ($1, $2, $3, $4, 'PENDING')
		RETURNING id;
	`

	var orderID int64

	err := db.DB.QueryRow(
		query,
		req.Symbol,
		req.Side,
		req.Type,
		req.Quantity,
	).Scan(&orderID)

	if err != nil {
		return 0, err
	}

	// 2. Publish to RabbitMQ
	payload := map[string]any{
		"internalOrderId": orderID,
		"symbol":  req.Symbol,
		"side":    req.Side,
		"type":    req.Type,
		"quantity": req.Quantity,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	if err := rabbitmq.Publish(body); err != nil {
		return 0, fmt.Errorf("failed to publish order: %w", err)
	}

	// 3. Return generated ID
	return orderID, nil
}


func UpdateOrder(
	orderID int64,
	status string,
	exchangeOrderID int64,
	executedPrice string,
	executedQuantity string,
) error {

	query := `
		UPDATE orders
		SET
			status = $1,
			exchange_order_id = $2,
			executed_price = $3,
			executed_quantity = $4,
			updated_at = NOW()
		WHERE id = $5
	`

	_, err := db.DB.Exec(
		query,
		status,
		exchangeOrderID,
		executedPrice,
		executedQuantity,
		orderID,
	)

	return err
}