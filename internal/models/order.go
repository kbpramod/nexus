package models

type OrderRequest struct {
	InternalOrderID int64   `json:"internalOrderId"`
	Symbol          string  `json:"symbol"`
	Side            string  `json:"side"`
	Type            string  `json:"type"`
	Quantity        float64 `json:"quantity"`
	Price           float64 `json:"price,omitempty"`
}

type OrderResponse struct {
	// Your internal ID
	InternalOrderID int64 `json:"-"`

	// Binance response
	ExchangeOrderID int64  `json:"orderId"`
	Symbol          string `json:"symbol"`
	Status          string `json:"status"`

	// Request details
	Side string `json:"side"`
	Type string `json:"type"`

	// Executed values
	ExecutedQuantity string `json:"executedQty"`
	ExecutedQuoteQty string `json:"cummulativeQuoteQty"`

	// Timestamp
	TransactTime int64 `json:"transactTime"`

	// Fill information
	Fills []Fill `json:"fills"`
}

type Fill struct {
	Price string `json:"price"`
	Qty   string `json:"qty"`
}