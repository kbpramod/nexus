package binance

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"nexus/internal/config"
	"nexus/internal/models"
)

func FetchPrice(symbol string) (*models.PriceResponse, error) {

	url := fmt.Sprintf(
		"https://api.binance.com/api/v3/ticker/price?symbol=%s",
		symbol,
	)

	requestedAt := time.Now().UnixMilli()

	resp, err := http.Get(url)

	receivedAt := time.Now().UnixMilli()

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"binance returned status %d",
			resp.StatusCode,
		)
	}

	var price models.PriceResponse

	err = json.NewDecoder(resp.Body).Decode(&price)

	price.RequestedAt = requestedAt
	price.ReceivedAt = receivedAt

	if err != nil {
		return nil, err
	}

	return &price, nil
}




func PlaceOrder(data models.OrderRequest) (*models.OrderResponse, error) {

	// Build query parameters
	InternalOrderID := data.InternalOrderID
	params := url.Values{}
	params.Set("symbol", data.Symbol)
	params.Set("side", data.Side)
	params.Set("type", data.Type)
	params.Set(
		"quantity",
		strconv.FormatFloat(data.Quantity, 'f', -1, 64),
	)
	params.Set(
		"timestamp",
		strconv.FormatInt(time.Now().UnixMilli(), 10),
	)

	// If LIMIT order, include price and timeInForce
	if data.Type == "LIMIT" {
		params.Set(
			"price",
			strconv.FormatFloat(data.Price, 'f', -1, 64),
		)
		params.Set("timeInForce", "GTC")
	}

	// Generate HMAC SHA256 signature
	mac := hmac.New(
		sha256.New,
		[]byte(config.Env.BinanceSecretKey),
	)

	mac.Write([]byte(params.Encode()))

	signature := hex.EncodeToString(mac.Sum(nil))

	params.Set("signature", signature)

	// Build request
	endpoint := config.Env.BinanceBaseURL +
		"/api/v3/order?" +
		params.Encode()

	fmt.Println(endpoint)

	req, err := http.NewRequest(
		"POST",
		endpoint,
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.Header.Set(
		"X-MBX-APIKEY",
		config.Env.BinanceAPIKey,
	)

	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	// Helpful while learning
	fmt.Println(string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"binance error: %s",
			string(body),
		)
	}

	// Minimal response parsing
	var result struct {
		Symbol               string `json:"symbol"`
	OrderID              int64  `json:"orderId"`
	Status               string `json:"status"`
	Side                 string `json:"side"`
	Type                 string `json:"type"`
	ExecutedQty          string `json:"executedQty"`
	CummulativeQuoteQty  string `json:"cummulativeQuoteQty"`
	TransactTime         int64  `json:"transactTime"`
	Fills                []models.Fill `json:"fills"`
	}

	err = json.Unmarshal(body, &result)

	if err != nil {
		return nil, err
	}

	return &models.OrderResponse{
	InternalOrderID:  InternalOrderID,
	ExchangeOrderID:  result.OrderID,
	Symbol:           result.Symbol,
	Status:           result.Status,
	Side:             result.Side,
	Type:             result.Type,
	ExecutedQuantity: result.ExecutedQty,
	ExecutedQuoteQty: result.CummulativeQuoteQty,
	TransactTime:     result.TransactTime,
	Fills:            result.Fills,
}, nil
}