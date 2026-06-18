package routes

import (
	"github.com/gin-gonic/gin"

	"nexus/internal/orders"
)

func RegisterRoutes(router *gin.Engine) {

	api := router.Group("/api/v1")

	{
		api.POST("/order", orders.CreateOrder)

		// Future endpoints
		// api.GET("/orders/:id", GetOrder)
		// api.DELETE("/orders/:id", CancelOrder)

		api.GET("/health", orders.Health)
	}
}