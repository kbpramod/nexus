"use client";

import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi, 
  SeriesMarker,
  CandlestickSeries,
  HistogramSeries
} from 'lightweight-charts';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface OpenPosition {
  id: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  sl?: number;
  tp?: number;
}

interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
}

interface TradingChartProps {
  candles: Candle[];
  openPositions: OpenPosition[];
  markers: ChartMarker[];
}

export default function TradingChart({ candles, openPositions, markers }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const activePriceLinesRef = useRef<any[]>([]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { color: '#0f172a' }, // Slate-900 matching dark theme
        textColor: '#94a3b8', // Slate-400
      },
      grid: {
        vertLines: { color: '#1e293b' }, // Slate-800
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: '#64748b',
          width: 1,
          style: 3, // Dotted
          labelBackgroundColor: '#334155',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: 3, // Dotted
          labelBackgroundColor: '#334155',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', // Emerald-500
      downColor: '#f43f5e', // Rose-500
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // Add Volume Series at the bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay over chart
    });

    // Configure volume scale placement
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8, // volume takes bottom 20% of chart
        bottom: 0,
      },
    });

    // Store references
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Candle & Volume Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    // Set Candlestick Data
    candleSeriesRef.current.setData(candles);

    // Set Volume Data
    const volumeData = candles.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)', // Low opacity green/red
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Adjust chart time scale to show newest data
    if (chartRef.current) {
      // Auto fit content if we just loaded new dataset, otherwise scroll to latest
      if (candles.length < 50) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles]);

  // Update Markers
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Map markers into lightweight-charts format
    const formattedMarkers: SeriesMarker<any>[] = markers.map(m => ({
      time: m.time,
      position: m.position,
      color: m.color,
      shape: m.shape,
      text: m.text,
      size: 1.5,
    }));

    candleSeriesRef.current.setMarkers(formattedMarkers);
  }, [markers]);

  // Update Price Lines for Open Positions (Entry, SL, TP)
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    // Clear previous price lines
    activePriceLinesRef.current.forEach(line => {
      candleSeries.removePriceLine(line);
    });
    activePriceLinesRef.current = [];

    // Draw new lines for each position
    openPositions.forEach(pos => {
      // 1. Entry price line (Cyber blue)
      const entryLine = candleSeries.createPriceLine({
        price: pos.entryPrice,
        color: '#3b82f6', 
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: `${pos.type} #${pos.id.slice(0,4)} Entry`,
      });
      activePriceLinesRef.current.push(entryLine);

      // 2. Stop Loss line (Rose crimson)
      if (pos.sl) {
        const slLine = candleSeries.createPriceLine({
          price: pos.sl,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `SL #${pos.id.slice(0,4)}`,
        });
        activePriceLinesRef.current.push(slLine);
      }

      // 3. Take Profit line (Emerald green)
      if (pos.tp) {
        const tpLine = candleSeries.createPriceLine({
          price: pos.tp,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `TP #${pos.id.slice(0,4)}`,
        });
        activePriceLinesRef.current.push(tpLine);
      }
    });

  }, [openPositions]);

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-1">
      <div ref={chartContainerRef} className="w-full" style={{ height: '480px' }} />
    </div>
  );
}
