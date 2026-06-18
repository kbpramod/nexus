package services

import (
	"encoding/json"
	"log"
	"time"

	"nexus/internal/models"
	"nexus/internal/redis"

	"github.com/gorilla/websocket"
)

func StartStream() {
	key := "quotes:BTCUSDT:BINANCE"

	url := "wss://stream.binance.com:9443/ws/btcusdt@ticker"

	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		log.Fatal("connection error:", err)
	}
	defer conn.Close()

	log.Println("Connected to Binance")

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			return
		}

		var ticker models.TickerEvent

		log.Println(string(message))

		err = json.Unmarshal(message, &ticker)
		if err != nil {
			log.Println("unmarshal error:", err)
			continue
		}

		err = redis.Client.HSet(
			redis.Ctx,
			key,
			"symbol", ticker.Symbol,
			"price", ticker.LastPrice,
			"bid", ticker.BidPrice,
			"ask", ticker.AskPrice,
			"timestamp", ticker.EventTime,
		).Err()

		if err != nil {
			log.Println("redis hset error:", err)
			continue
		}

		err = redis.Client.Expire(
			redis.Ctx,
			key,
			10*time.Second,
		).Err()

		if err != nil {
			log.Println("redis expire error:", err)
		}

		log.Printf(
			"%s price=%s bid=%s ask=%s",
			ticker.Symbol,
			ticker.LastPrice,
			ticker.BidPrice,
			ticker.AskPrice,
		)
	}
}