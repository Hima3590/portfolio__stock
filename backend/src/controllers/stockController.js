import Stock from '../models/Stock.js';
import axios from 'axios';

const getApiKey = () => process.env.FINNHUB_API_KEY;

// Global in-memory cache
const finnhubCache = new Map();

/* ===============================
   CRUD OPERATIONS
================================ */

export const createStock = async (req, res) => {
  const startTime = performance.now();
  try {
    const { symbol, quantity, buyPrice } = req.body;

    if (!symbol || !quantity || !buyPrice) {
      return res.status(400).json({ error: 'symbol, quantity, buyPrice are required' });
    }

    const cacheKey = symbol.toUpperCase();
    let currentPrice = buyPrice; 
    const cachedItem = finnhubCache.get(cacheKey);

    // ⚡ OPTIMIZATION: Check cache first to save an API call during creation
    if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
      currentPrice = cachedItem.data.price;
    } else {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
        const response = await axios.get(url);
        if (response.data && response.data.c) {
          currentPrice = parseFloat(response.data.c);
          
          // Seed the cache with the new price
          finnhubCache.set(cacheKey, { 
            data: { symbol: cacheKey, price: currentPrice }, 
            timestamp: Date.now() 
          });
        }
      } catch (apiErr) {
        console.error(`[API Error] Create stock price fetch failed for ${cacheKey}:`, apiErr.message);
      }
    }

    const stock = await Stock.create({
      symbol: cacheKey, // Consistent casing
      quantity,
      buyPrice,
      currentPrice,
      user: req.userId
    });

    console.log(`⏱️ [Latency] createStock took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.status(201).json(stock);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllStocks = async (req, res) => {
  const startTime = performance.now(); 
  try {
    const stocks = await Stock.find({ user: req.userId }).lean(); // Fast read-only query
    
    console.log(`⏱️ [Latency] getAllStocks took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json(stocks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateStock = async (req, res) => {
  const startTime = performance.now();
  try {
    const { id } = req.params;
    const { quantity, buyPrice } = req.body;

    // Use findOneAndUpdate with lean() to bypass heavy hydration overhead
    const stock = await Stock.findOneAndUpdate(
      { _id: id, user: req.userId },
      { quantity, buyPrice },
      { new: true }
    ).lean();

    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    console.log(`⏱️ [Latency] updateStock took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json(stock);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteStock = async (req, res) => {
  const startTime = performance.now();
  try {
    const { id } = req.params;

    const stock = await Stock.findOneAndDelete({
      _id: id,
      user: req.userId
    }).lean();

    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    console.log(`⏱️ [Latency] deleteStock took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json({ message: 'Stock deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ===============================
   Feature 8 – Search stocks
================================ */

export const searchStock = async (req, res) => {
  const startTime = performance.now();
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query q is required' });

    const searchKey = q.toUpperCase();
    const cacheKey = `SEARCH_${searchKey}`;
    const cachedItem = finnhubCache.get(cacheKey);

    // ⚡ OPTIMIZATION: Cache the search suggestions mapping to avoid rate-limits
    if (cachedItem && (Date.now() - cachedItem.timestamp < 10 * 60 * 1000)) { // 10 min cache for search
      console.log(`🚀 [Cache Hit] Serving stock search for query: ${searchKey}`);
      return res.json(cachedItem.data);
    }

    if (!getApiKey()) {
      return res.status(503).json({ error: 'Stock search is unavailable (API key not configured)' });
    }

    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchKey)}&token=${getApiKey()}`;
    const response = await axios.get(url, { timeout: 15000 });

    const results = (response.data.result || []).map(match => ({
      symbol: match.symbol.toUpperCase(),
      name: match.description,
      region: match.type || 'N/A'
    }));

    finnhubCache.set(cacheKey, { data: results, timestamp: Date.now() });

    console.log(`⏱️ [Latency] searchStock took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to search stocks' });
  }
};

/* ===============================
   Feature 9 – Live price (public)
================================ */

export const getLivePrice = async (req, res) => {
  const startTime = performance.now();
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const cacheKey = symbol.toUpperCase();
    const cachedItem = finnhubCache.get(cacheKey);

    if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
      console.log(`🚀 [Cache Hit] Serving live price for ${cacheKey}`);
      return res.json(cachedItem.data);
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
    const response = await axios.get(url);

    if (!response.data || response.data.c === undefined) {
      return res.status(400).json({ error: 'Price unavailable' });
    }

    const responseData = {
      symbol: cacheKey,
      price: parseFloat(response.data.c)
    };

    finnhubCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    console.log(`⏱️ [Latency] getLivePrice took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json(responseData);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch live price' });
  }
};


/* ===============================
   Feature 10 – Stock P/L (Single Stock Lookup)
================================ */
export const getPortfolioStockInfo = async (req, res) => {
  const startTime = performance.now();
  try {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });
    
    const cacheKey = symbol.toUpperCase();

    // Use .lean() for fast read-only execution
    const stock = await Stock.findOne({
      user: req.userId,
      symbol: cacheKey
    }).lean();

    if (!stock) return res.status(404).json({ error: 'Stock not in portfolio' });

    let currentPrice = stock.currentPrice || stock.buyPrice;
    const cachedItem = finnhubCache.get(cacheKey);

    if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
      currentPrice = cachedItem.data.price;
    } else {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
        const response = await axios.get(url);
        
        if (response.data && response.data.c) {
          currentPrice = parseFloat(response.data.c);
          finnhubCache.set(cacheKey, { 
            data: { symbol: cacheKey, price: currentPrice }, 
            timestamp: Date.now() 
          });
        }
      } catch (apiErr) {
        console.error(`[API Error] Fetching live price for ${cacheKey}:`, apiErr.message);
      }
    }

    const currentValue = currentPrice * stock.quantity;
    const investedValue = stock.buyPrice * stock.quantity;
    const profitLoss = currentValue - investedValue;
    const percentChange = investedValue === 0 ? 0 : (profitLoss / investedValue) * 100;

    console.log(`⏱️ [Latency] getPortfolioStockInfo took ${(performance.now() - startTime).toFixed(2)}ms`);

    return res.json({
      symbol: cacheKey,
      currentPrice,
      buyPrice: stock.buyPrice,
      quantity: stock.quantity,
      profitLoss: profitLoss.toFixed(2),
      percentChange: percentChange.toFixed(2)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch stock info' });
  }
};

/* ===============================
   🔥 Feature 11 – Portfolio Overview (Parallelized & Read-Only)
================================ */
export const getPortfolioOverview = async (req, res) => {
  const startTime = performance.now();
  try {
    const userId = req.userId;
    const stocks = await Stock.find({ user: userId }).lean();
    
    console.log(`[Portfolio Overview] Found ${stocks.length} stocks for user ${userId}`);

    // Parallelize external API network requests using Promise.all
    const stockDataResults = await Promise.all(stocks.map(async (stock) => {
      const cacheKey = stock.symbol.toUpperCase();
      let stockCurrentPrice = stock.currentPrice || stock.buyPrice;
      const cachedItem = finnhubCache.get(cacheKey);

      if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
        console.log(`[Cache Hit] ${cacheKey}: ${cachedItem.data.price}`);
        stockCurrentPrice = cachedItem.data.price;
      } else {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
          const response = await axios.get(url);
          
          console.log(`[Finnhub Response] ${cacheKey}:`, JSON.stringify(response.data));
          
          if (response.data && response.data.c) {
            stockCurrentPrice = parseFloat(response.data.c);
            console.log(`[Price Updated] ${cacheKey}: ${stockCurrentPrice}`);
            finnhubCache.set(cacheKey, { 
              data: { symbol: cacheKey, price: stockCurrentPrice }, 
              timestamp: Date.now() 
            });
          } else {
            console.warn(`[Warning] No price found for ${cacheKey} in Finnhub response`);
          }
        } catch (apiErr) {
          console.error(`[API Error] Overview price fetch failed for ${cacheKey}:`, apiErr.message);
        }
      }

      const invested = stock.buyPrice * stock.quantity;
      const current = stockCurrentPrice * stock.quantity;
      console.log(`[Calculation] ${cacheKey}: invested=${invested}, current=${current}`);

      return {
        investedValue: invested,
        currentValue: current
      };
    }));

    // Perform reduction out of the async block to prevent DB write side-effects
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const result of stockDataResults) {
      totalInvested += result.investedValue;
      totalCurrentValue += result.currentValue;
    }

    const profitLoss = totalCurrentValue - totalInvested;
    const profitLossPercent = totalInvested === 0 ? 0 : (profitLoss / totalInvested) * 100;

    console.log(`[Portfolio Overview Final] Invested=${totalInvested}, Current=${totalCurrentValue}, Profit=${profitLoss}`);
    console.log(`⏱️ [Latency] getPortfolioOverview took ${(performance.now() - startTime).toFixed(2)}ms`);

    return res.json({
      totalInvested: Number(totalInvested.toFixed(2)),
      currentValue: Number(totalCurrentValue.toFixed(2)),
      profitLoss: Number(profitLoss.toFixed(2)),
      profitLossPercent: Number(profitLossPercent.toFixed(2))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch portfolio overview' });
  }
};

/* ===============================
   Feature 12 – Stock Summary
================================ */
export const getStockSummary = async (req, res) => {
  const startTime = performance.now();
  try {
    const userId = req.userId;
    const stocks = await Stock.find({ user: userId }).lean();

    const stockSummaryResults = await Promise.all(stocks.map(async (stock) => {
      const cacheKey = stock.symbol.toUpperCase();
      let stockCurrentPrice = stock.currentPrice || stock.buyPrice;
      const cachedItem = finnhubCache.get(cacheKey);

      if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
        stockCurrentPrice = cachedItem.data.price;
      } else {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
          const response = await axios.get(url);
          
          console.log(`[Finnhub Response] ${cacheKey}:`, JSON.stringify(response.data));
          
          if (response.data && response.data.c) {
            stockCurrentPrice = parseFloat(response.data.c);
            finnhubCache.set(cacheKey, { 
              data: { symbol: cacheKey, price: stockCurrentPrice }, 
              timestamp: Date.now() 
            });
          } else {
            console.warn(`[Warning] No price found for ${cacheKey} in Finnhub response`);
          }
        } catch (apiErr) {
          console.error(`[API Error] Summary price fetch failed for ${cacheKey}:`, apiErr.message);
        }
      }

      return {
        quantity: stock.quantity,
        investedValue: stock.buyPrice * stock.quantity,
        currentValue: stockCurrentPrice * stock.quantity
      };
    }));

    let totalQuantity = 0;
    let totalInvested = 0;
    let totalCurrent = 0;

    for (const item of stockSummaryResults) {
      totalQuantity += item.quantity;
      totalInvested += item.investedValue;
      totalCurrent += item.currentValue;
    }

    console.log(`⏱️ [Latency] getStockSummary took ${(performance.now() - startTime).toFixed(2)}ms`);

    return res.json({
      totalStocks: stocks.length,
      totalQuantity,
      totalInvested: Number(totalInvested.toFixed(2)),
      totalCurrentValue: Number(totalCurrent.toFixed(2)),
      totalProfitLoss: Number((totalCurrent - totalInvested).toFixed(2))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch stock summary' });
  }
};

/* ===============================
   Feature 13 – Portfolio Breakdown (Chart Data)
================================ */
export const getPortfolioBreakdown = async (req, res) => {
  const startTime = performance.now();
  try {
    const userId = req.userId;
    const stocks = await Stock.find({ user: userId }).lean();

    const breakdown = await Promise.all(stocks.map(async (stock) => {
      const cacheKey = stock.symbol.toUpperCase();
      let currentPrice = stock.currentPrice || stock.buyPrice;
      const cachedItem = finnhubCache.get(cacheKey);

      if (cachedItem && (Date.now() - cachedItem.timestamp < 3 * 60 * 1000)) {
        currentPrice = cachedItem.data.price;
      } else {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${getApiKey()}`;
          const response = await axios.get(url);
          
          console.log(`[Finnhub Response] ${cacheKey}:`, JSON.stringify(response.data));
          
          if (response.data && response.data.c) {
            currentPrice = parseFloat(response.data.c);
            finnhubCache.set(cacheKey, { 
              data: { symbol: cacheKey, price: currentPrice }, 
              timestamp: Date.now() 
            });
          } else {
            console.warn(`[Warning] No price found for ${cacheKey} in Finnhub response`);
          }
        } catch (apiErr) {
          console.error(`[API Error] Breakdown price fetch failed for ${cacheKey}:`, apiErr.message);
        }
      }

      const investedValue = stock.buyPrice * stock.quantity;
      const currentValue = currentPrice * stock.quantity;

      return {
        symbol: cacheKey,
        quantity: Number(stock.quantity),
        buyPrice: Number(stock.buyPrice),
        currentPrice: Number(currentPrice),
        investedValue: Number(investedValue.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        profitLoss: Number((currentValue - investedValue).toFixed(2))
      };
    }));

    console.log(`⏱️ [Latency] getPortfolioBreakdown took ${(performance.now() - startTime).toFixed(2)}ms`);
    return res.json(breakdown);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch portfolio breakdown' });
  }
};
