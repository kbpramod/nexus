package models

type TickerEvent struct {
	Event     string `json:"e"`
	EventTime int64  `json:"E"`

	Symbol string `json:"s"`

	LastPrice string `json:"c"`
	CloseTime int64  `json:"C"`

	BidPrice string `json:"b"`
	AskPrice string `json:"a"`
}