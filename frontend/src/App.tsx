import { useState, useEffect } from 'react'
import './App.css'
import { checkApiHealth, createMarketBuyOrder } from './api/order'
import { copyToClipboard } from './utils/clipboard'

interface OrderSuccess {
  orderid: number
  status: string
  symbol: string
  side: 'BUY'
  type: 'MARKET'
  quantity: number
  timestamp: string
}

function App() {
  // Connection Health Status
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  // Locked parameters
  const symbol = 'BTCUSDT'
  const side = 'BUY'
  const type = 'MARKET'
  
  // Mutable State
  const [quantity, setQuantity] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placedOrder, setPlacedOrder] = useState<OrderSuccess | null>(null)
  const [copied, setCopied] = useState(false)

  // Check API health status
  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      const healthy = await checkApiHealth()
      if (active) {
        setIsConnected(healthy)
      }
    }

    const timeoutId = setTimeout(() => {
      checkHealth()
    }, 0)

    const interval = setInterval(checkHealth, 5000)
    return () => {
      active = false
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [])

  // Copy Order ID utility
  const handleCopy = async (id: number) => {
    const success = await copyToClipboard(id.toString())
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setPlacedOrder(null)

    // Quantity Validation
    const qtyNum = parseFloat(quantity)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Quantity must be a positive number greater than 0.')
      setIsLoading(false)
      return
    }

    // Ensure up to 4 decimal places
    const decimalParts = quantity.split('.')
    if (decimalParts.length > 1 && decimalParts[1].length > 4) {
      setError('Quantity can have at most 4 decimal places.')
      setIsLoading(false)
      return
    }

    try {
      const order = await createMarketBuyOrder(qtyNum)

      setPlacedOrder({
        orderid: order.orderid,
        status: order.status,
        symbol,
        side,
        type,
        quantity: qtyNum,
        timestamp: new Date().toLocaleTimeString(),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while placing your order.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-container">
      {/* Terminal Header */}
      <header className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-logo">NEXUS</span>
          <span className="terminal-badge">DEV PANEL</span>
        </div>
        <div className="connection-status">
          <span
            className={`status-dot ${
              isConnected === true
                ? 'connected'
                : isConnected === false
                ? 'disconnected'
                : ''
            }`}
          ></span>
          {isConnected === true
            ? 'Connected'
            : isConnected === false
            ? 'Offline'
            : 'Connecting...'}
        </div>
      </header>

      {/* Main Ticket Entry */}
      <main className="trading-ticket">
        <h2 className="ticket-title">Order Entry</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Side Selection (Locked: BUY) */}
            <div className="form-group">
              <label className="form-label">Side</label>
              <div className="side-selector">
                <button
                  type="button"
                  className="side-btn buy active"
                  style={{ cursor: 'default' }}
                  onClick={(e) => e.preventDefault()}
                >
                  Buy
                </button>
              </div>
            </div>

            {/* Type Selection (Locked: MARKET) */}
            <div className="form-group">
              <label className="form-label">Order Type</label>
              <div className="type-selector">
                <button
                  type="button"
                  className="type-tab active"
                  style={{ cursor: 'default' }}
                  onClick={(e) => e.preventDefault()}
                >
                  Market
                </button>
              </div>
            </div>

            {/* Symbol Input (Locked: BTCUSDT) */}
            <div className="form-group">
              <label className="form-label">Symbol</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="trading-input"
                  value={symbol}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  step="0.0001"
                  className="trading-input"
                  placeholder="0.0000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Place ${side} Order`
              )}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <svg
              className="error-icon"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Placed Order Success Receipt */}
        {placedOrder && (
          <div className="receipt-card">
            <div className="receipt-header">
              <div className="receipt-success-title">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Order Dispatched</span>
              </div>
              <button
                className="btn-secondary"
                onClick={() => handleCopy(placedOrder.orderid)}
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            <div className="receipt-grid">
              <span className="receipt-label">Order ID</span>
              <span className="receipt-val order-id-highlight">{placedOrder.orderid}</span>

              <span className="receipt-label">Symbol</span>
              <span className="receipt-val">{placedOrder.symbol}</span>

              <span className="receipt-label">Side</span>
              <span
                className="receipt-val"
                style={{ color: 'var(--buy)' }}
              >
                {placedOrder.side}
              </span>

              <span className="receipt-label">Type</span>
              <span className="receipt-val">{placedOrder.type}</span>

              <span className="receipt-label">Quantity</span>
              <span className="receipt-val">{placedOrder.quantity}</span>

              <span className="receipt-label">Status</span>
              <span className="receipt-val">{placedOrder.status}</span>

              <span className="receipt-label">Time</span>
              <span className="receipt-val">{placedOrder.timestamp}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
