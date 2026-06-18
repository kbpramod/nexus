package models

type PriceResponse struct {
	Symbol      string `json:"symbol"`
	Price       string `json:"price"`
	RequestedAt int64  `json:"requested_at"`
	ReceivedAt  int64  `json:"received_at"`
}