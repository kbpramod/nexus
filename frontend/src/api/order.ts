const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_BASE = `${BASE_URL}/api/v1`

export interface OrderRequest {
  symbol: string
  side: 'BUY'
  type: 'MARKET'
  quantity: number
}

export interface OrderResponse {
  orderid: number
  status: string
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    if (res.ok) {
      const data = await res.json()
      return data.status === 'ok'
    }
  } catch {
    // ignore
  }
  return false
}

export async function createMarketBuyOrder(quantity: number): Promise<OrderResponse> {
  const payload: OrderRequest = {
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity
  }

  const response = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Server responded with status ${response.status}`)
  }

  return {
    orderid: data.orderid !== undefined ? data.orderid : data.orderId,
    status: data.status || 'FILLED'
  }
}
