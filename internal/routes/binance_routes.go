package routes

// import (
// 	"nexus/internal/exchanges/binance"

// 	"github.com/gin-gonic/gin"
// )

// func RegisterRoutes(router *gin.Engine) {

// 	router.GET("/health", func(c *gin.Context) {
// 		c.JSON(200, gin.H{
// 			"status": "ok",
// 		})
// 	})

// 	router.GET("/price/:symbol", binance.GetPrice)
// 	router.POST("/order", binance.CreateOrder)
// }