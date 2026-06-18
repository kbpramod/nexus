package api

import (
	"github.com/gin-gonic/gin"

	"nexus/internal/orders"
)

func RegisterRoutes(router *gin.Engine) {

	api := router.Group("/api/v2")

	{
		api.POST("/orders", orders.CreateOrder)

		// Future endpoints
		// api.GET("/orders/:id", GetOrder)
		// api.DELETE("/orders/:id", CancelOrder)

		api.GET("/health", orders.Health)
	}
}