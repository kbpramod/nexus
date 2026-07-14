const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuration for assets
const assetsConfig = {
  BTCUSDT: {
    startPrice: 42200,
    volatility: 0.006, // hourly volatility
    trendDrift: 0.00008, // daily upward drift
    volumeBase: 1500,
    decimals: 2
  },
  ETHUSDT: {
    startPrice: 2280,
    volatility: 0.007,
    trendDrift: 0.00006,
    volumeBase: 8000,
    decimals: 2
  },
  XAUUSD: {
    startPrice: 2060,
    volatility: 0.003,
    trendDrift: 0.00004,
    volumeBase: 5000,
    decimals: 2
  },
  EURUSD: {
    startPrice: 1.0950,
    volatility: 0.001,
    trendDrift: -0.000005,
    volumeBase: 12000,
    decimals: 4
  }
};

function generateCandles(asset, year) {
  const config = assetsConfig[asset];
  const candles = [];

  // Start times
  const startDate = new Date(`${year}-01-01T00:00:00Z`);
  const endDate = new Date(`${year}-12-31T23:00:00Z`);
  let currentTime = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  let currentPrice = config.startPrice;

  // Let's create a varying trend state
  let trendDirection = 1; // 1 = bullish, -1 = bearish, 0 = sideways
  let trendDuration = 0;
  
  // Custom random walk
  while (currentTime <= endTimestamp) {
    const date = new Date(currentTime * 1000);
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();

    // Weekend check: forex/gold markets are closed on weekends (Saturday & Sunday)
    const isWeekend = (dayOfWeek === 6 || dayOfWeek === 0);
    if ((asset === 'XAUUSD' || asset === 'EURUSD') && isWeekend) {
      // Advance 1 hour without adding a candle
      currentTime += 3600;
      continue;
    }

    // Change trend direction occasionally (every 3 to 15 days)
    if (trendDuration <= 0) {
      trendDirection = Math.random() > 0.45 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      trendDuration = Math.floor(Math.random() * 240) + 72; // hours
    }
    trendDuration--;

    // Session volatility factor (London & NY overlap is high vol, Asian is low vol)
    let sessionMultiplier = 0.7; // Asian session (00:00 - 08:00 UTC)
    if (hour >= 8 && hour < 12) sessionMultiplier = 1.0; // London session
    if (hour >= 12 && hour < 17) sessionMultiplier = 1.6; // London/NY overlap
    if (hour >= 17 && hour < 21) sessionMultiplier = 1.2; // NY afternoon
    if (hour >= 21) sessionMultiplier = 0.8; // Sydney/Tokyo transition

    // Random news events (1% chance per day/24h)
    const isNewsEvent = Math.random() < (0.01 / 24);
    const newsMultiplier = isNewsEvent ? (Math.random() > 0.5 ? 4.0 : -4.0) : 1.0;

    // Calculate next price
    const baseVol = config.volatility * sessionMultiplier;
    const drift = config.trendDrift * trendDirection;
    const randomChange = (Math.random() - 0.5) * 2 * baseVol;
    
    // Price change
    const pctChange = drift + randomChange + (isNewsEvent ? newsMultiplier * baseVol : 0);
    const open = currentPrice;
    let close = open * (1 + pctChange);
    
    // Boundary check for crypto / gold (cannot go negative)
    if (close <= 0) close = 0.01;

    // High and Low calculation
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    
    const wickHighFactor = Math.random() * 0.4 * baseVol;
    const wickLowFactor = Math.random() * 0.4 * baseVol;

    let high = bodyHigh * (1 + wickHighFactor);
    let low = bodyLow * (1 - wickLowFactor);

    // Keep it realistic
    if (high < bodyHigh) high = bodyHigh;
    if (low > bodyLow) low = bodyLow;

    // Decimals rounding
    const round = (val) => parseFloat(val.toFixed(config.decimals));

    const candle = {
      time: currentTime,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.floor(config.volumeBase * (sessionMultiplier + Math.random()) * (isNewsEvent ? 5 : 1))
    };

    candles.push(candle);
    
    currentPrice = close;
    currentTime += 3600; // 1 hour step
  }

  // Adjust starting price for next year's generator to maintain continuity
  config.startPrice = currentPrice;

  return candles;
}

// Generate files
const assets = ['BTCUSDT', 'ETHUSDT', 'XAUUSD', 'EURUSD'];
const years = [2024, 2025];

assets.forEach(asset => {
  years.forEach(year => {
    console.log(`Generating data for ${asset} ${year}...`);
    const data = generateCandles(asset, year);
    const filename = `${asset.toLowerCase()}_${year}.json`;
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Wrote ${data.length} candles to ${filename}`);
  });
});

console.log('All historical data generated successfully!');
