package orders

import (
	"net/http"

	"nexus/internal/models"

	"github.com/gin-gonic/gin"
)

func CreateOrder(c *gin.Context) {
	var req models.OrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	orderID, err := PlaceOrder(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(202, gin.H{
		"orderId": orderID,
		"status":  "PENDING",
	})
}

func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}