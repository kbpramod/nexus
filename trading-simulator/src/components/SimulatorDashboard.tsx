"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  BookOpen, 
  Award, 
  Activity, 
  Edit2, 
  Check, 
  X,
  FileText,
  Heart,
  Star
} from 'lucide-react';
import TradingChart from './TradingChart';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: number;
  entryIndex: number;
  quantity: number;
  sl?: number;
  tp?: number;
  trailingSl?: number;
  highestPriceSinceEntry?: number;
  lowestPriceSinceEntry?: number;
  
  // Exit fields
  exitPrice?: number;
  exitTime?: number;
  exitIndex?: number;
  pnl?: number;
  reason?: string;
  
  // Journal fields
  emotion?: string;
  confidence?: number;
  notes?: string;
}

const ASSETS = ['XAUUSD', 'BTCUSDT', 'ETHUSDT', 'EURUSD'];
const YEARS = [2024, 2025];
const MONTHS = [
  { label: 'All Months', value: 'All' },
  { label: 'January', value: '0' },
  { label: 'February', value: '1' },
  { label: 'March', value: '2' },
  { label: 'April', value: '3' },
  { label: 'May', value: '4' },
  { label: 'June', value: '5' },
  { label: 'July', value: '6' },
  { label: 'August', value: '7' },
  { label: 'September', value: '8' },
  { label: 'October', value: '9' },
  { label: 'November', value: '10' },
  { label: 'December', value: '11' }
];

export default function SimulatorDashboard() {
  // Configuration State
  const [selectedAsset, setSelectedAsset] = useState<string>('BTCUSDT');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [randomStart, setRandomStart] = useState<boolean>(true);
  
  // Playback Engine State
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(5); // multiplier: 1x, 5x, 20x, 100x
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Trading State
  const [startingBalance, setStartingBalance] = useState<number>(10000);
  const [balance, setBalance] = useState<number>(10000);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<Position[]>([]);
  
  // Execution Ticket Form
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState<number>(1);
  const [useSL, setUseSL] = useState<boolean>(false);
  const [slPrice, setSlPrice] = useState<string>('');
  const [useTP, setUseTP] = useState<boolean>(false);
  const [tpPrice, setTpPrice] = useState<string>('');
  const [useTrailingSL, setUseTrailingSL] = useState<boolean>(false);
  const [trailingSlDistance, setTrailingSlDistance] = useState<string>('');

  // Editing open positions inline
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editSL, setEditSL] = useState<string>('');
  const [editTP, setEditTP] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'statistics'>('positions');

  // Journal details editing
  const [journalingTradeId, setJournalingTradeId] = useState<string | null>(null);
  const [journalEmotion, setJournalEmotion] = useState<string>('Calm');
  const [journalConfidence, setJournalConfidence] = useState<number>(5);
  const [journalNotes, setJournalNotes] = useState<string>('');

  // Fetch candle data
  const loadData = async (asset: string, year: number) => {
    setIsLoadingData(true);
    setSimError(null);
    try {
      const res = await fetch(`/data/${asset.toLowerCase()}_${year}.json`);
      if (!res.ok) throw new Error('Data file not found on server');
      const data: Candle[] = await res.json();
      
      // Filter by month if specified
      let filtered = data;
      if (selectedMonth !== 'All') {
        const mIdx = parseInt(selectedMonth, 10);
        filtered = data.filter(c => new Date(c.time * 1000).getUTCMonth() === mIdx);
      }

      if (filtered.length < 300) {
        throw new Error('Dataset too small. Please select a larger range.');
      }

      setAllCandles(filtered);

      // Determine starting index (e.g. provide 200 bars historical buffer)
      let startIdx = 200;
      if (randomStart) {
        const minIdx = 200;
        const maxIdx = Math.floor(filtered.length * 0.4);
        startIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
      }
      
      setCurrentIdx(startIdx);
      setIsPlaying(false);
      
      // Load or Initialize trading state for this asset/year
      const storageKey = `sim_session_${asset}_${year}_${selectedMonth}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setBalance(parsed.balance || 10000);
        setStartingBalance(parsed.startingBalance || 10000);
        setOpenPositions(parsed.openPositions || []);
        setClosedTrades(parsed.closedTrades || []);
      } else {
        setBalance(10000);
        setStartingBalance(10000);
        setOpenPositions([]);
        setClosedTrades([]);
      }

    } catch (err: any) {
      setSimError(err.message || 'Failed to load historical database');
      setAllCandles([]);
      setCurrentIdx(-1);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(selectedAsset, selectedYear);
  }, [selectedAsset, selectedYear]);

  // Persist simulator session data to localStorage
  const persistSession = useCallback((
    bal: number,
    startBal: number,
    open: Position[],
    closed: Position[]
  ) => {
    if (allCandles.length === 0) return;
    const storageKey = `sim_session_${selectedAsset}_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(storageKey, JSON.stringify({
      balance: bal,
      startingBalance: startBal,
      openPositions: open,
      closedTrades: closed
    }));
  }, [selectedAsset, selectedYear, selectedMonth, allCandles]);

  // Handle position checking for SL/TP and Trailing SL
  const checkOpenPositions = useCallback((newCandle: Candle, nextIdx: number) => {
    setOpenPositions(prevOpen => {
      const updatedOpen: Position[] = [];
      const newlyClosed: Position[] = [];

      prevOpen.forEach(pos => {
        let isHit = false;
        let exitPrice = 0;
        let exitReason = '';

        const high = newCandle.high;
        const low = newCandle.low;
        const open = newCandle.open;

        // Maintain high/low tracking for trailing stop calculations
        let highest = pos.highestPriceSinceEntry || pos.entryPrice;
        let lowest = pos.lowestPriceSinceEntry || pos.entryPrice;
        if (high > highest) highest = high;
        if (low < lowest) lowest = low;

        let currentSl = pos.sl;
        if (pos.trailingSl) {
          if (pos.type === 'BUY') {
            const calculatedSl = highest - pos.trailingSl;
            if (!currentSl || calculatedSl > currentSl) {
              currentSl = parseFloat(calculatedSl.toFixed(4));
            }
          } else {
            const calculatedSl = lowest + pos.trailingSl;
            if (!currentSl || calculatedSl < currentSl) {
              currentSl = parseFloat(calculatedSl.toFixed(4));
            }
          }
        }

        // Validate SL / TP breaches
        if (pos.type === 'BUY') {
          if (currentSl && low <= currentSl) {
            isHit = true;
            exitPrice = open < currentSl ? open : currentSl;
            exitReason = pos.trailingSl ? 'Trailing SL Hit' : 'Stop Loss Hit';
          } else if (pos.tp && high >= pos.tp) {
            isHit = true;
            exitPrice = open > pos.tp ? open : pos.tp;
            exitReason = 'Take Profit Hit';
          }
        } else { // SELL
          if (currentSl && high >= currentSl) {
            isHit = true;
            exitPrice = open > currentSl ? open : currentSl;
            exitReason = pos.trailingSl ? 'Trailing SL Hit' : 'Stop Loss Hit';
          } else if (pos.tp && low <= pos.tp) {
            isHit = true;
            exitPrice = open < pos.tp ? open : pos.tp;
            exitReason = 'Take Profit Hit';
          }
        }

        if (isHit) {
          const pnl = pos.type === 'BUY'
            ? (exitPrice - pos.entryPrice) * pos.quantity
            : (pos.entryPrice - exitPrice) * pos.quantity;

          newlyClosed.push({
            ...pos,
            sl: currentSl,
            highestPriceSinceEntry: highest,
            lowestPriceSinceEntry: lowest,
            exitPrice: parseFloat(exitPrice.toFixed(4)),
            exitTime: newCandle.time,
            exitIndex: nextIdx,
            pnl: parseFloat(pnl.toFixed(2)),
            reason: exitReason
          });
        } else {
          updatedOpen.push({
            ...pos,
            sl: currentSl,
            highestPriceSinceEntry: highest,
            lowestPriceSinceEntry: lowest
          });
        }
      });

      if (newlyClosed.length > 0) {
        setClosedTrades(prevClosed => {
          const nextClosed = [...prevClosed, ...newlyClosed];
          setBalance(prevBalance => {
            const totalPnl = newlyClosed.reduce((sum, p) => sum + (p.pnl || 0), 0);
            const nextBal = parseFloat((prevBalance + totalPnl).toFixed(2));
            persistSession(nextBal, startingBalance, updatedOpen, nextClosed);
            return nextBal;
          });
          return nextClosed;
        });
      } else {
        persistSession(balance, startingBalance, updatedOpen, closedTrades);
      }

      return updatedOpen;
    });
  }, [balance, startingBalance, closedTrades, persistSession]);

  // Autoplay control loop
  useEffect(() => {
    if (!isPlaying || currentIdx >= allCandles.length - 1) {
      if (currentIdx >= allCandles.length - 1) {
        setIsPlaying(false);
      }
      return;
    }

    const intervalDelay = speed === 1 ? 1000 : speed === 5 ? 400 : speed === 20 ? 100 : 20;

    const timer = setInterval(() => {
      setCurrentIdx(prev => {
        const nextIdx = prev + 1;
        if (nextIdx >= allCandles.length) {
          clearInterval(timer);
          setIsPlaying(false);
          return prev;
        }
        checkOpenPositions(allCandles[nextIdx], nextIdx);
        return nextIdx;
      });
    }, intervalDelay);

    return () => clearInterval(timer);
  }, [isPlaying, speed, currentIdx, allCandles, checkOpenPositions]);

  // Next candle manual trigger
  const handleNextCandle = () => {
    if (currentIdx >= allCandles.length - 1) return;
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    checkOpenPositions(allCandles[nextIdx], nextIdx);
  };

  // Time-travel rollback support
  const rollbackToIdx = (newIdx: number) => {
    const allPositions = [...openPositions, ...closedTrades];
    
    // De-duplicate using unique placement ID
    const map = new Map<string, Position>();
    allPositions.forEach(p => map.set(p.id, p));
    const uniquePlacements = Array.from(map.values());

    // 1. Recover closed trades that terminated at/before newIdx
    const nextClosed = uniquePlacements.filter(p => 
      p.entryIndex <= newIdx && p.exitIndex !== undefined && p.exitIndex <= newIdx
    );

    // 2. Recover open positions (opened before newIdx, and either open or closed later)
    const nextOpen = uniquePlacements.filter(p => 
      p.entryIndex <= newIdx && (p.exitIndex === undefined || p.exitIndex > newIdx)
    ).map(p => {
      // Revert exit metadata
      const { exitPrice, exitTime, exitIndex, pnl, reason, ...cleanOpen } = p;
      return cleanOpen as Position;
    });

    // 3. Recompute balance history
    const closedPnl = nextClosed.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const nextBal = parseFloat((startingBalance + closedPnl).toFixed(2));

    setOpenPositions(nextOpen);
    setClosedTrades(nextClosed);
    setBalance(nextBal);
    persistSession(nextBal, startingBalance, nextOpen, nextClosed);
  };

  // Previous candle step back
  const handlePrevCandle = () => {
    if (currentIdx <= 200) return; // Keep minimal historical buffer
    const prevIdx = currentIdx - 1;
    setCurrentIdx(prevIdx);
    rollbackToIdx(prevIdx);
  };

  // Restart Simulation
  const handleRestart = () => {
    loadData(selectedAsset, selectedYear);
  };

  // Order Placement logic
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentIdx < 0 || allCandles.length === 0) return;

    const currentCandle = allCandles[currentIdx];
    const price = currentCandle.close;

    // Validate Form Fields
    let sl: number | undefined;
    if (useSL && slPrice) {
      sl = parseFloat(slPrice);
      if (isNaN(sl) || sl <= 0) return;
      if (orderSide === 'BUY' && sl >= price) {
        alert('Buy Stop Loss must be lower than current price.');
        return;
      }
      if (orderSide === 'SELL' && sl <= price) {
        alert('Sell Stop Loss must be higher than current price.');
        return;
      }
    }

    let tp: number | undefined;
    if (useTP && tpPrice) {
      tp = parseFloat(tpPrice);
      if (isNaN(tp) || tp <= 0) return;
      if (orderSide === 'BUY' && tp <= price) {
        alert('Buy Take Profit must be higher than current price.');
        return;
      }
      if (orderSide === 'SELL' && tp >= price) {
        alert('Sell Take Profit must be lower than current price.');
        return;
      }
    }

    let trailingSl: number | undefined;
    if (useTrailingSL && trailingSlDistance) {
      trailingSl = parseFloat(trailingSlDistance);
      if (isNaN(trailingSl) || trailingSl <= 0) return;
    }

    const newPosition: Position = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      symbol: selectedAsset,
      type: orderSide,
      entryPrice: price,
      entryTime: currentCandle.time,
      entryIndex: currentIdx,
      quantity: qty,
      sl,
      tp,
      trailingSl,
      highestPriceSinceEntry: price,
      lowestPriceSinceEntry: price
    };

    const nextOpen = [...openPositions, newPosition];
    setOpenPositions(nextOpen);
    persistSession(balance, startingBalance, nextOpen, closedTrades);

    // Reset ticket inputs
    setSlPrice('');
    setTpPrice('');
    setTrailingSlDistance('');
  };

  // Manual Position Close
  const handleClosePosition = (id: string) => {
    if (currentIdx < 0) return;
    const currentCandle = allCandles[currentIdx];
    
    setOpenPositions(prevOpen => {
      const pos = prevOpen.find(p => p.id === id);
      if (!pos) return prevOpen;

      const exitPrice = currentCandle.close;
      const pnl = pos.type === 'BUY'
        ? (exitPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - exitPrice) * pos.quantity;

      const closedPos: Position = {
        ...pos,
        exitPrice: parseFloat(exitPrice.toFixed(4)),
        exitTime: currentCandle.time,
        exitIndex: currentIdx,
        pnl: parseFloat(pnl.toFixed(2)),
        reason: 'Manual Close'
      };

      const nextOpen = prevOpen.filter(p => p.id !== id);
      setClosedTrades(prevClosed => {
        const nextClosed = [...prevClosed, closedPos];
        setBalance(prevBalance => {
          const nextBal = parseFloat((prevBalance + pnl).toFixed(2));
          persistSession(nextBal, startingBalance, nextOpen, nextClosed);
          return nextBal;
        });
        return nextClosed;
      });

      return nextOpen;
    });
  };

  // Save Inline SL/TP Edits
  const handleSaveEdit = (id: string) => {
    setOpenPositions(prevOpen => {
      const nextOpen = prevOpen.map(pos => {
        if (pos.id !== id) return pos;

        let parsedSl = editSL ? parseFloat(editSL) : undefined;
        let parsedTp = editTP ? parseFloat(editTP) : undefined;

        // Validation bounds checks
        if (parsedSl && isNaN(parsedSl)) parsedSl = pos.sl;
        if (parsedTp && isNaN(parsedTp)) parsedTp = pos.tp;

        return {
          ...pos,
          sl: parsedSl,
          tp: parsedTp
        };
      });
      persistSession(balance, startingBalance, nextOpen, closedTrades);
      return nextOpen;
    });
    setEditingPositionId(null);
  };

  // Open Edit Modifiers
  const startEditing = (pos: Position) => {
    setEditingPositionId(pos.id);
    setEditSL(pos.sl ? pos.sl.toString() : '');
    setEditTP(pos.tp ? pos.tp.toString() : '');
  };

  // Journal Save logic
  const handleSaveJournal = (id: string) => {
    setClosedTrades(prevClosed => {
      const nextClosed = prevClosed.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          emotion: journalEmotion,
          confidence: journalConfidence,
          notes: journalNotes
        };
      });
      persistSession(balance, startingBalance, openPositions, nextClosed);
      return nextClosed;
    });
    setJournalingTradeId(null);
  };

  // Start journaling modal settings
  const openJournalForm = (trade: Position) => {
    setJournalingTradeId(trade.id);
    setJournalEmotion(trade.emotion || 'Calm');
    setJournalConfidence(trade.confidence || 5);
    setJournalNotes(trade.notes || '');
  };

  // Calculate live unrealized P&L
  const getUnrealizedPnl = () => {
    if (currentIdx < 0 || allCandles.length === 0) return 0;
    const currentPrice = allCandles[currentIdx].close;
    return openPositions.reduce((sum, pos) => {
      const pnl = pos.type === 'BUY'
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity;
      return sum + pnl;
    }, 0);
  };

  const unrealizedPnl = getUnrealizedPnl();
  const equity = parseFloat((balance + unrealizedPnl).toFixed(2));

  // --- Statistics Calculations (Phase 4) ---
  const winRate = (() => {
    if (closedTrades.length === 0) return 0;
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    return parseFloat(((wins / closedTrades.length) * 100).toFixed(1));
  })();

  const profitFactor = (() => {
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
    const grossProfits = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    if (grossLosses === 0) return grossProfits > 0 ? Infinity : 1.0;
    return parseFloat((grossProfits / grossLosses).toFixed(2));
  })();

  const avgRiskReward = (() => {
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
    if (avgLoss === 0) return 'N/A';
    return `1:${(avgWin / avgLoss).toFixed(1)}`;
  })();

  const maxDrawdown = (() => {
    let peak = startingBalance;
    let maxDd = 0;
    let runningEquity = startingBalance;

    closedTrades.forEach(t => {
      runningEquity += (t.pnl || 0);
      if (runningEquity > peak) peak = runningEquity;
      const dd = peak > 0 ? ((peak - runningEquity) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;
    });

    return parseFloat(maxDd.toFixed(1));
  })();

  const sharpeRatio = (() => {
    if (closedTrades.length < 2) return 0;
    const pnls = closedTrades.map(t => t.pnl || 0);
    const mean = pnls.reduce((sum, v) => sum + v, 0) / pnls.length;
    const variance = pnls.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return parseFloat((mean / stdDev).toFixed(2));
  })();

  const averageHoldTime = (() => {
    if (closedTrades.length === 0) return 'N/A';
    const totalHours = closedTrades.reduce((sum, t) => sum + ((t.exitIndex || 0) - t.entryIndex), 0);
    return `${(totalHours / closedTrades.length).toFixed(1)} hours`;
  })();

  // Build dynamic markers list for chart
  const getMarkers = () => {
    const list: any[] = [];
    
    // Open position entry arrows
    openPositions.forEach(pos => {
      const candle = allCandles[pos.entryIndex];
      if (candle) {
        list.push({
          time: candle.time,
          position: pos.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: pos.type === 'BUY' ? '#10b981' : '#f43f5e',
          shape: pos.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${pos.type}`,
        });
      }
    });

    // Closed position entries and exits
    closedTrades.forEach(pos => {
      const entryCandle = allCandles[pos.entryIndex];
      if (entryCandle) {
        list.push({
          time: entryCandle.time,
          position: pos.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: pos.type === 'BUY' ? '#10b981' : '#f43f5e',
          shape: pos.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${pos.type}`,
        });
      }
      if (pos.exitIndex !== undefined) {
        const exitCandle = allCandles[pos.exitIndex];
        if (exitCandle) {
          list.push({
            time: exitCandle.time,
            position: pos.type === 'BUY' ? 'aboveBar' : 'belowBar',
            color: '#c084fc', // Purple shape
            shape: pos.type === 'BUY' ? 'arrowDown' : 'arrowUp',
            text: `OUT`,
          });
        }
      }
    });

    return list.sort((a, b) => a.time - b.time);
  };

  // Construct Custom SVG Equity Curve Line
  const renderEquityCurve = () => {
    if (closedTrades.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
          No trade history yet to display equity path.
        </div>
      );
    }

    const width = 600;
    const height = 120;
    const padding = 10;

    // Equity points starting from initial deposit
    const points = [startingBalance];
    let running = startingBalance;
    closedTrades.forEach(t => {
      running += (t.pnl || 0);
      points.push(running);
    });

    const maxVal = Math.max(...points) * 1.002;
    const minVal = Math.min(...points) * 0.998;
    const range = maxVal - minVal || 100;

    const coords = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - minVal) / range) * (height - 2 * padding);
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    const fillD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Equity Path</h4>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                <stop offset="100%" stopColor="rgba(139, 92, 246, 0.0)" />
              </linearGradient>
            </defs>
            {/* Grid horizontal markers */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#1e293b" strokeDasharray="4" />
            
            {/* Gradient Fill under path */}
            <path d={fillD} fill="url(#equityGrad)" />
            
            {/* Line Path */}
            <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Interactive node highlights */}
            {coords.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="3" fill="#ffffff" stroke="#8b5cf6" strokeWidth="1.5" />
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const currentCandle = allCandles[currentIdx];
  const timeStr = currentCandle 
    ? new Date(currentCandle.time * 1000).toLocaleString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' UTC'
    : 'N/A';

  return (
    <div className="flex flex-col gap-6 p-4 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
            NEXUS <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 font-semibold uppercase tracking-wider">Trading Simulator</span>
          </h1>
          <p className="text-sm text-slate-400">Practice discretionary execution in real market conditions - hidden future candles.</p>
        </div>
        
        {/* Dynamic Status Badges */}
        <div className="flex items-center gap-6 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl shadow-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Instrument</span>
            <span className="text-sm font-bold text-slate-300">{selectedAsset}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Playback Time</span>
            <span className="text-sm font-semibold text-violet-400">{timeStr}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Price</span>
            <span className="text-sm font-bold text-emerald-400">{currentCandle ? currentCandle.close.toFixed(2) : '0.00'}</span>
          </div>
        </div>
      </header>

      {simError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm">
          {simError}
        </div>
      )}

      {/* TOP CONFIGURATION AND PLAYBACK ROW (Phase 1 & 2) */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Config Controls */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Historical Instrument</label>
            <select 
              className="input-field w-full"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              disabled={isPlaying}
            >
              {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Year</label>
            <select 
              className="input-field w-full"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              disabled={isPlaying}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Month</label>
            <select 
              className="input-field w-full"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isPlaying}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Start controls */}
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-2 rounded-md w-full select-none">
              <input 
                type="checkbox"
                checked={randomStart}
                onChange={(e) => setRandomStart(e.target.checked)}
                disabled={isPlaying}
                className="accent-violet-500"
              />
              <div className="flex flex-col">
                <span className="text-xs text-slate-300 font-medium">Hindsight Shield</span>
                <span className="text-[10px] text-slate-500">Start from a random index</span>
              </div>
            </label>
            
            <button 
              onClick={handleRestart}
              disabled={isLoadingData}
              className="btn btn-secondary flex items-center justify-center p-2 rounded-md"
              title="Restart Simulation"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* Playback controls (Phase 2) */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevCandle}
              disabled={isPlaying || currentIdx <= 200 || allCandles.length === 0}
              className="btn btn-secondary px-3 py-2 rounded-lg"
              title="Step Backward (Time Travel)"
            >
              <SkipBack className="h-4 w-4 mr-1" /> Step Back
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={allCandles.length === 0}
              className={`btn ${isPlaying ? 'btn-secondary text-orange-400 border-orange-500/30' : 'btn-primary'} px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Play
                </>
              )}
            </button>
            
            <button 
              onClick={handleNextCandle}
              disabled={isPlaying || currentIdx >= allCandles.length - 1 || allCandles.length === 0}
              className="btn btn-secondary px-3 py-2 rounded-lg"
              title="Step Forward"
            >
              Step Next <SkipForward className="h-4 w-4 ml-1" />
            </button>
          </div>

          {/* Speed settings */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase px-2 font-bold">Speed</span>
            {[1, 5, 20, 100].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs px-2.5 py-1 rounded font-semibold transition ${speed === s ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN PLOTTING AND TICKET PANEL GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* TradingView Chart Wrapper */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          {allCandles.length > 0 && currentIdx >= 0 ? (
            <TradingChart 
              candles={allCandles.slice(0, currentIdx + 1)}
              openPositions={openPositions}
              markers={getMarkers()}
            />
          ) : (
            <div className="h-[480px] bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 gap-2">
              {isLoadingData ? (
                <>
                  <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
                  <span className="text-sm font-semibold text-slate-300">Loading historical data file...</span>
                </>
              ) : (
                <>
                  <Activity className="h-10 w-10 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-400">Click "Start Simulation" to initialize</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Order Execution Ticket (Phase 3) */}
        <div className="flex flex-col gap-4">
          <div className="terminal-card flex flex-col h-full gap-4">
            <div className="flex border border-slate-800 rounded-lg p-0.5 overflow-hidden">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`flex-1 text-center py-2 rounded text-sm font-bold transition ${orderSide === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`flex-1 text-center py-2 rounded text-sm font-bold transition ${orderSide === 'SELL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                SELL
              </button>
            </div>

            {/* Account Summary metrics widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Free Balance</span>
                <span className="font-semibold text-slate-300">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Unrealized P&L</span>
                <span className={`font-semibold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-[1px] bg-slate-800/80 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Net Equity</span>
                <span className="font-bold text-violet-400">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Execution inputs form */}
            <form onSubmit={handlePlaceOrder} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Position Quantity</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                  className="input-field"
                  required
                />
              </div>

              {/* Stop Loss Options */}
              <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useSL}
                    onChange={(e) => setUseSL(e.target.checked)}
                    className="accent-violet-500"
                  />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stop Loss</span>
                </label>
                {useSL && (
                  <input 
                    type="number" 
                    step="0.0001"
                    placeholder="SL Price"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="input-field"
                    required
                  />
                )}
              </div>

              {/* Take Profit Options */}
              <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useTP}
                    onChange={(e) => setUseTP(e.target.checked)}
                    className="accent-violet-500"
                  />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Take Profit</span>
                </label>
                {useTP && (
                  <input 
                    type="number" 
                    step="0.0001"
                    placeholder="TP Price"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="input-field"
                    required
                  />
                )}
              </div>

              {/* Trailing Stop Loss options */}
              <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useTrailingSL}
                    onChange={(e) => setUseTrailingSL(e.target.checked)}
                    className="accent-violet-500"
                  />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trailing Stop</span>
                </label>
                {useTrailingSL && (
                  <input 
                    type="number" 
                    step="0.0001"
                    placeholder="Offset (in price units)"
                    value={trailingSlDistance}
                    onChange={(e) => setTrailingSlDistance(e.target.value)}
                    className="input-field"
                    required
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={allCandles.length === 0}
                className={`btn w-full py-2.5 font-bold uppercase mt-3 rounded-lg ${
                  orderSide === 'BUY' ? 'btn-success' : 'btn-danger'
                }`}
              >
                Execute {orderSide} Market
              </button>
            </form>
          </div>
        </div>

      </section>

      {/* LOWER TAB DATA TABLES SECTION (Phase 3, 4, 5) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setActiveTab('positions')}
            className={`tab-btn ${activeTab === 'positions' ? 'active' : ''} flex items-center gap-1.5`}
          >
            <Activity className="h-4 w-4" /> Open Positions ({openPositions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''} flex items-center gap-1.5`}
          >
            <FileText className="h-4 w-4" /> Trade History & Journal ({closedTrades.length})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''} flex items-center gap-1.5`}
          >
            <Award className="h-4 w-4" /> Performance Stats
          </button>
        </div>

        <div className="p-5 min-h-[220px]">
          
          {/* TAB 1: OPEN POSITIONS */}
          {activeTab === 'positions' && (
            <div className="overflow-x-auto">
              {openPositions.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10">
                  No active open positions. Set details in execution panel and click Execute.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider font-semibold">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Qty</th>
                      <th className="pb-3">Entry Price</th>
                      <th className="pb-3">Stop Loss</th>
                      <th className="pb-3">Take Profit</th>
                      <th className="pb-3">Current PnL</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map(pos => {
                      const curCandle = allCandles[currentIdx];
                      const curPrice = curCandle ? curCandle.close : pos.entryPrice;
                      const pnl = pos.type === 'BUY'
                        ? (curPrice - pos.entryPrice) * pos.quantity
                        : (pos.entryPrice - curPrice) * pos.quantity;

                      const isEditing = editingPositionId === pos.id;

                      return (
                        <tr key={pos.id} className="border-b border-slate-800/60 hover:bg-slate-900/50">
                          <td className="py-3.5 font-mono font-medium text-slate-400">#{pos.id}</td>
                          <td className="py-3.5 font-bold text-slate-300">{pos.symbol}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                              pos.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {pos.type}
                            </span>
                          </td>
                          <td className="py-3.5 font-semibold font-mono text-slate-300">{pos.quantity}</td>
                          <td className="py-3.5 font-mono text-slate-300">${pos.entryPrice.toFixed(2)}</td>
                          
                          {/* SL field with inline edit */}
                          <td className="py-3.5 font-mono">
                            {isEditing ? (
                              <input 
                                type="number" 
                                step="0.0001"
                                value={editSL}
                                onChange={(e) => setEditSL(e.target.value)}
                                className="input-field py-0.5 px-1.5 w-24 bg-slate-950"
                                placeholder="No SL"
                              />
                            ) : (
                              <span className={pos.sl ? 'text-red-400' : 'text-slate-500'}>
                                {pos.sl ? `$${pos.sl.toFixed(2)}` : 'None'}
                              </span>
                            )}
                            {pos.trailingSl && (
                              <span className="text-[9px] block text-violet-400">Trailing ({pos.trailingSl})</span>
                            )}
                          </td>
                          
                          {/* TP field with inline edit */}
                          <td className="py-3.5 font-mono">
                            {isEditing ? (
                              <input 
                                type="number" 
                                step="0.0001"
                                value={editTP}
                                onChange={(e) => setEditTP(e.target.value)}
                                className="input-field py-0.5 px-1.5 w-24 bg-slate-950"
                                placeholder="No TP"
                              />
                            ) : (
                              <span className={pos.tp ? 'text-emerald-400' : 'text-slate-500'}>
                                {pos.tp ? `$${pos.tp.toFixed(2)}` : 'None'}
                              </span>
                            )}
                          </td>

                          <td className={`py-3.5 font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </td>

                          <td className="py-3.5 text-right flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(pos.id)}
                                  className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  title="Save SL/TP modifications"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingPositionId(null)}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700"
                                  title="Cancel edits"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(pos)}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white"
                                  title="Modify Stop Loss or Take Profit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleClosePosition(pos.id)}
                                  className="btn btn-danger py-1 px-2.5 text-[10px] font-bold rounded uppercase tracking-wider"
                                >
                                  Close
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: TRADE HISTORY AND JOURNAL */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-6">
              <div className="overflow-x-auto">
                {closedTrades.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-10">
                    No closed trades record found. Simulation results will accumulate here.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider font-semibold">
                        <th className="pb-3">ID</th>
                        <th className="pb-3">Symbol</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Qty</th>
                        <th className="pb-3">Entry/Exit Price</th>
                        <th className="pb-3">Stop Loss</th>
                        <th className="pb-3">Exit Time</th>
                        <th className="pb-3">Realized PnL</th>
                        <th className="pb-3">Exit Trigger</th>
                        <th className="pb-3 text-right">Journal Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.map(trade => {
                        const hasJournal = trade.emotion || trade.notes;
                        return (
                          <React.Fragment key={trade.id}>
                            <tr className="border-b border-slate-800/40 hover:bg-slate-900/40">
                              <td className="py-3 font-mono text-slate-400">#{trade.id}</td>
                              <td className="py-3 font-bold text-slate-300">{trade.symbol}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {trade.type}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-slate-300">{trade.quantity}</td>
                              <td className="py-3 font-mono text-slate-300">
                                ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice?.toFixed(2)}
                              </td>
                              <td className="py-3 font-mono text-slate-400">
                                {trade.sl ? `$${trade.sl.toFixed(2)}` : 'None'}
                              </td>
                              <td className="py-3 text-slate-400">
                                {new Date((trade.exitTime || 0) * 1000).toLocaleString('en-US', {
                                  timeZone: 'UTC',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className={`py-3 font-bold font-mono ${(trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(trade.pnl || 0) >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                              </td>
                              <td className="py-3 text-slate-400 font-medium">{trade.reason}</td>
                              
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => openJournalForm(trade)}
                                  className={`btn py-1 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ml-auto ${
                                    hasJournal 
                                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20' 
                                      : 'btn-secondary'
                                  }`}
                                >
                                  <BookOpen className="h-3 w-3" /> 
                                  {hasJournal ? 'Reviewed' : 'Journal'}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Inline Trade details / Journal display if available */}
                            {hasJournal && journalingTradeId !== trade.id && (
                              <tr className="bg-slate-950/40 text-[11px]">
                                <td colSpan={10} className="px-4 py-2 border-b border-slate-800/40">
                                  <div className="flex flex-wrap gap-4 text-slate-400">
                                    {trade.emotion && (
                                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                                        <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
                                        <span>Emotion: <span className="font-semibold text-slate-200">{trade.emotion}</span></span>
                                      </div>
                                    )}
                                    {trade.confidence && (
                                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                        <span>Confidence: <span className="font-semibold text-slate-200">{trade.confidence}/5</span></span>
                                      </div>
                                    )}
                                    {trade.notes && (
                                      <div className="flex-1 min-w-[200px]">
                                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] block">Journal Notes</span>
                                        <span className="italic text-slate-300">"{trade.notes}"</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Journal Modal Panel Overlay */}
              {journalingTradeId && (
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 mt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400">
                      Journal Entry for Trade #{journalingTradeId}
                    </h3>
                    <button 
                      onClick={() => setJournalingTradeId(null)}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-bold uppercase">Emotion Felt</label>
                      <select
                        value={journalEmotion}
                        onChange={(e) => setJournalEmotion(e.target.value)}
                        className="input-field"
                      >
                        <option value="Calm">Calm & Centered</option>
                        <option value="Fearful">Fearful / Fearing loss</option>
                        <option value="Greedy">Greedy / FOMO</option>
                        <option value="Excited">Excited / Overconfident</option>
                        <option value="Anxious">Anxious / Impatient</option>
                        <option value="Angry">Frustrated / Revenge Trade</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-bold uppercase">Confidence Level</label>
                      <div className="flex items-center gap-1.5 h-10">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setJournalConfidence(star)}
                            className="p-1 focus:outline-none"
                          >
                            <Star className={`h-5 w-5 ${star <= journalConfidence ? 'text-amber-400 fill-amber-400' : 'text-slate-650'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase">Notes & Technical Rationale</label>
                    <textarea
                      placeholder="Identify market setup (e.g. Orderblock sweep, support bounce), what went right/wrong..."
                      value={journalNotes}
                      onChange={(e) => setJournalNotes(e.target.value)}
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setJournalingTradeId(null)}
                      className="btn btn-secondary py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveJournal(journalingTradeId)}
                      className="btn btn-primary py-1.5 px-4 font-bold"
                    >
                      Save Journal Entry
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERFORMANCE STATISTICS */}
          {activeTab === 'statistics' && (
            <div className="flex flex-col gap-6">
              
              {/* Stat metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Return</span>
                  <span className={`text-lg font-bold ${balance >= startingBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {balance >= startingBalance ? '+' : ''}
                    {((balance - startingBalance) / startingBalance * 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    ${(balance - startingBalance).toFixed(2)} profit
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Win Rate</span>
                  <span className="text-lg font-bold text-slate-200">{winRate}%</span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {closedTrades.filter(t => (t.pnl || 0) > 0).length} wins / {closedTrades.length} trades
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Drawdown</span>
                  <span className="text-lg font-bold text-rose-400">{maxDrawdown}%</span>
                  <span className="text-[10px] text-slate-500 mt-1">Peak-to-valley loss</span>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Profit Factor</span>
                  <span className="text-lg font-bold text-violet-400">
                    {profitFactor === Infinity ? '∞' : profitFactor}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Avg R:R {avgRiskReward}</span>
                </div>
              </div>

              {/* Extra ratios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2.5 text-xs bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-500">Starting Balance</span>
                    <span className="font-semibold text-slate-300">${startingBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-500">Ending Balance</span>
                    <span className="font-semibold text-slate-300">${balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-500">Sharpe Ratio</span>
                    <span className="font-semibold text-slate-300">{sharpeRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Holding Time</span>
                    <span className="font-semibold text-slate-300">{averageHoldTime}</span>
                  </div>
                </div>

                {/* SVG Equity Curve line graph */}
                <div className="md:col-span-2">
                  {renderEquityCurve()}
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

    </div>
  );
}
