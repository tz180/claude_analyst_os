// Stock Services - Alpha Vantage API Integration
import { stockQuoteCacheServices } from './supabaseServices';

const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Rate limiting configuration
// Start with 4 requests/second (250ms between requests)
// Queue will auto-increase delay if rate limits are hit
const BASE_RATE_LIMIT_DELAY = 250; // 250ms = 4 requests per second

// =============================================================================
// GLOBAL API REQUEST QUEUE
// =============================================================================
// This queue serializes ALL Alpha Vantage API calls to prevent rate limiting.
// Without this, concurrent calls from different parts of the app (Portfolio load,
// buy modal price fetch, etc.) can burst the API and trigger rate limits.
// =============================================================================

class ApiRequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.currentDelay = BASE_RATE_LIMIT_DELAY;
    this.consecutiveSuccesses = 0;
    // Track in-flight requests by URL to deduplicate concurrent calls
    this.pendingRequests = new Map();
  }

  // Add a request to the queue and return a promise that resolves with the response
  // Deduplicates concurrent requests for the same URL
  async enqueue(url, options = {}) {
    // Check if there's already a pending request for this URL
    if (this.pendingRequests.has(url)) {
      console.log(`🔄 API queue: reusing pending request for ${new URL(url).searchParams.get('symbol') || 'N/A'}`);
      return this.pendingRequests.get(url);
    }

    const requestPromise = new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });

    // Track this request so concurrent calls can reuse it
    this.pendingRequests.set(url, requestPromise);

    // Clean up after request completes
    requestPromise.finally(() => {
      this.pendingRequests.delete(url);
    });

    return requestPromise;
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { url, options, resolve, reject } = this.queue.shift();

      // Calculate time to wait before next request
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const waitTime = Math.max(0, this.currentDelay - timeSinceLastRequest);

      if (waitTime > 0) {
        const waitDisplay = waitTime >= 1000 ? `${(waitTime / 1000).toFixed(1)}s` : `${waitTime}ms`;
        console.log(`⏳ API queue: waiting ${waitDisplay} before next request...`);
        await new Promise(r => setTimeout(r, waitTime));
      }

      try {
        console.log(`🌐 API queue: fetching ${new URL(url).searchParams.get('function')} for ${new URL(url).searchParams.get('symbol') || 'N/A'}`);
        this.lastRequestTime = Date.now();
        const response = await fetch(url, options);

        // Check for rate limiting in response (we'll handle this in the caller,
        // but also track it here for adaptive delay)
        const clonedResponse = response.clone();
        try {
          const data = await clonedResponse.json();
          if (data['Note'] || (data['Information'] && data['Information'].includes('API'))) {
            // Rate limit hit - increase delay significantly
            this.currentDelay = Math.min(this.currentDelay * 2, 60000); // Max 60s
            this.consecutiveSuccesses = 0;
            console.warn(`⚠️ API queue: rate limit detected, increasing delay to ${this.currentDelay / 1000}s`);
          } else if (!data['Error Message']) {
            // Successful request - slowly decrease delay if we've had many successes
            this.consecutiveSuccesses++;
            if (this.consecutiveSuccesses >= 5 && this.currentDelay > BASE_RATE_LIMIT_DELAY) {
              this.currentDelay = Math.max(this.currentDelay * 0.9, BASE_RATE_LIMIT_DELAY);
              const delayDisplay = this.currentDelay >= 1000 ? `${(this.currentDelay / 1000).toFixed(1)}s` : `${Math.round(this.currentDelay)}ms`;
              console.log(`✓ API queue: ${this.consecutiveSuccesses} successes, reducing delay to ${delayDisplay}`);
            }
          }
        } catch {
          // Response wasn't JSON, that's fine
        }

        resolve(response);
      } catch (error) {
        console.error('API queue fetch error:', error);
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  // Get current queue length (useful for debugging)
  get length() {
    return this.queue.length;
  }
}

// Singleton instance - all API calls go through this queue
const apiQueue = new ApiRequestQueue();

// Wrapper for fetch that goes through the queue
const queuedFetch = (url, options) => apiQueue.enqueue(url, options);

// Helper to normalize numeric values coming from Alpha Vantage
const parseNullableNumber = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return null;
    const parsed = parseFloat(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Alpha Vantage occasionally returns CSV for calendar endpoints; keep parsing simple but reliable
const parseCsvToObjects = (text) => {
  if (!text) return [];
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((header, idx) => {
      const rawValue = values[idx] ?? '';
      row[header] = rawValue.replace(/^"|"$/g, '').trim();
    });
    return row;
  });
};

const parseEarningsCalendarBody = (text) => {
  const trimmed = text?.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  if (/^symbol\s*,/i.test(trimmed)) {
    return parseCsvToObjects(trimmed);
  }

  return { message: trimmed };
};

const computeEnterpriseValue = (rawEV, marketCap, totalDebt, cashAndEquivalents) => {
  if (rawEV !== null && rawEV !== undefined) {
    return rawEV;
  }

  if (marketCap == null) {
    return null;
  }

  const debtValue = totalDebt ?? 0;
  const cashValue = cashAndEquivalents ?? 0;

  if (totalDebt == null && cashAndEquivalents == null) {
    return marketCap;
  }

  return marketCap + debtValue - cashValue;
};

// Build a stock quote object from time series data (daily fallback)
const buildQuoteFromSeries = (symbol, latestDate, latestValues, previousValues) => {
  const price = parseFloat(latestValues['4. close']);
  const previousClose = previousValues ? parseFloat(previousValues['4. close']) : price;
  const change = previousClose ? price - previousClose : 0;
  const changePercent =
    previousClose && previousClose !== 0
      ? `${((change / previousClose) * 100).toFixed(2)}%`
      : '0.00%';

  return {
    symbol,
    price,
    change,
    changePercent,
    volume: parseInt(latestValues['5. volume']),
    previousClose,
    open: parseFloat(latestValues['1. open']),
    high: parseFloat(latestValues['2. high']),
    low: parseFloat(latestValues['3. low']),
    lastUpdated: latestDate
  };
};

const fetchDailyQuoteFallback = async (symbol) => {
  console.log('Falling back to TIME_SERIES_DAILY for', symbol);
  const response = await queuedFetch(
    `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('TIME_SERIES_DAILY response keys:', Object.keys(data));

  if (data['Error Message']) {
    const normalizedError = data['Error Message'].includes('TIME_SERIES_INTRADAY')
      ? 'Alpha Vantage cannot return intraday data for this ticker on the current plan. Please try another symbol or wait before retrying.'
      : data['Error Message'];
    return { success: false, error: normalizedError };
  }

  if (data['Note']) {
    return { success: false, error: `API rate limit exceeded: ${data['Note']}` };
  }

  const timeSeriesData = data['Time Series (Daily)'];
  if (!timeSeriesData || Object.keys(timeSeriesData).length === 0) {
    return {
      success: false,
      error: `No daily price data found for symbol: ${symbol}.`
    };
  }

  const sortedEntries = Object.entries(timeSeriesData).sort(
    (a, b) => new Date(b[0]) - new Date(a[0])
  );

  const [latestDate, latestValues] = sortedEntries[0];
  const previousValues = sortedEntries[1]?.[1];

  return {
    success: true,
    data: buildQuoteFromSeries(symbol, latestDate, latestValues, previousValues)
  };
};

// Debug logging
console.log('=== ENVIRONMENT DEBUG ===');
console.log('process.env.REACT_APP_ALPHA_VANTAGE_API_KEY:', process.env.REACT_APP_ALPHA_VANTAGE_API_KEY);
console.log('ALPHA_VANTAGE_API_KEY variable:', ALPHA_VANTAGE_API_KEY);
console.log('API key length:', ALPHA_VANTAGE_API_KEY ? ALPHA_VANTAGE_API_KEY.length : 'undefined');
console.log('API key type:', typeof ALPHA_VANTAGE_API_KEY);
console.log('API key truthy check:', !!ALPHA_VANTAGE_API_KEY);
console.log('All REACT_APP env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
console.log('All environment variables:', Object.keys(process.env));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Vercel environment check:', process.env.VERCEL ? 'Running on Vercel' : 'Not on Vercel');
console.log('=== END DEBUG ===');

// Check if API key is configured
if (!ALPHA_VANTAGE_API_KEY) {
  console.warn('Alpha Vantage API key not found. Please set REACT_APP_ALPHA_VANTAGE_API_KEY in your .env file or Vercel environment variables');
  console.warn('Current environment variables available:', Object.keys(process.env).filter(key => key.includes('ALPHA')));
}

export const stockServices = {
  // Test API key with a simple endpoint
  async testAPIKey() {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      console.log('Testing API key with simple endpoint...');
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=IBM&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      const data = await response.json();
      console.log('API test response:', data);
      
      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }
      
      if (data['Note']) {
        return { success: false, error: `API rate limit exceeded: ${data['Note']}` };
      }
      
      return { success: true, message: 'API key is working', data: data };
    } catch (error) {
      console.error('Error testing API key:', error);
      return { success: false, error: error.message };
    }
  },

  // Check API key status and usage
  async checkAPIStatus() {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      console.log('Checking Alpha Vantage API status...');
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=1min&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      const data = await response.json();
      console.log('API Status check response:', data);
      
      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }
      
      if (data['Note']) {
        return { success: false, error: `API rate limit exceeded: ${data['Note']}` };
      }
      
      return { success: true, message: 'API key is working' };
    } catch (error) {
      console.error('Error checking API status:', error);
      return { success: false, error: error.message };
    }
  },

  // Get real-time stock quote
  // Uses cache-first approach to reduce API calls
  async getStockQuote(symbol, skipCache = false) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // Check cache first (unless explicitly skipped)
      if (!skipCache) {
        const cachedQuote = await stockQuoteCacheServices.getCachedQuote(upperSymbol);
        if (cachedQuote) {
          console.log(`📦 Cache hit for ${upperSymbol} quote (age: ${Math.round((new Date() - new Date(cachedQuote.fetchedAt)) / 1000 / 60)} min)`);
          return {
            success: true,
            data: {
              symbol: cachedQuote.ticker,
              price: cachedQuote.price,
              change: cachedQuote.change,
              changePercent: `${cachedQuote.changePercent.toFixed(4)}%`,
              volume: cachedQuote.volume,
              previousClose: cachedQuote.previousClose,
              open: cachedQuote.open,
              high: cachedQuote.high,
              low: cachedQuote.low,
              lastUpdated: cachedQuote.lastTradingDay,
              fromCache: true
            }
          };
        }
      }

      console.log(`🌐 Fetching stock quote for ${upperSymbol} from API...`);

      // Try GLOBAL_QUOTE first (more reliable for free tier)
      const quoteResponse = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!quoteResponse.ok) {
        throw new Error(`HTTP error! status: ${quoteResponse.status}`);
      }

      const quoteData = await quoteResponse.json();

      if (quoteData['Error Message']) {
        console.log('GLOBAL_QUOTE error:', quoteData['Error Message']);
        return { success: false, error: quoteData['Error Message'] };
      }

      if (quoteData['Note']) {
        console.log('GLOBAL_QUOTE rate limit:', quoteData['Note']);
        return { success: false, error: `API rate limit exceeded: ${quoteData['Note']}` };
      }

      // Check for Alpha Vantage information message (rate limit)
      if (quoteData['Information'] && quoteData['Information'].includes('API key')) {
        console.log('Alpha Vantage rate limit detected:', quoteData['Information']);
        return {
          success: false,
          error: `Alpha Vantage free tier limit reached. Please wait a few minutes and try again, or upgrade to premium for unlimited access.`
        };
      }

      const quote = quoteData['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        console.log('No GLOBAL_QUOTE data, falling back to daily series...');
        const fallbackResult = await fetchDailyQuoteFallback(upperSymbol);

        // Cache the fallback result if successful
        if (fallbackResult.success && fallbackResult.data) {
          const fbData = fallbackResult.data;
          const fbChangePercent = typeof fbData.changePercent === 'string'
            ? parseFloat(fbData.changePercent.replace('%', ''))
            : fbData.changePercent || 0;

          await stockQuoteCacheServices.cacheQuote({
            ticker: upperSymbol,
            price: fbData.price,
            change: fbData.change || 0,
            changePercent: fbChangePercent,
            volume: fbData.volume || null,
            previousClose: fbData.previousClose || null,
            open: fbData.open || null,
            high: fbData.high || null,
            low: fbData.low || null,
            lastTradingDay: fbData.lastUpdated || null
          });
        }

        return fallbackResult;
      }

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = quote['10. change percent'];
      const parsedChangePercent = changePercent ? parseFloat(changePercent.replace('%', '')) : 0;

      // Cache the result
      await stockQuoteCacheServices.cacheQuote({
        ticker: upperSymbol,
        price: price,
        change: change,
        changePercent: parsedChangePercent,
        volume: parseInt(quote['06. volume']) || null,
        previousClose: parseFloat(quote['08. previous close']) || null,
        open: parseFloat(quote['02. open']) || null,
        high: parseFloat(quote['03. high']) || null,
        low: parseFloat(quote['04. low']) || null,
        lastTradingDay: quote['07. latest trading day'] || null
      });

      return {
        success: true,
        data: {
          symbol: quote['01. symbol'],
          price: price,
          change: change,
          changePercent: changePercent,
          volume: parseInt(quote['06. volume']),
          previousClose: parseFloat(quote['08. previous close']),
          open: parseFloat(quote['02. open']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          lastUpdated: quote['07. latest trading day']
        }
      };
    } catch (error) {
      console.error('Error fetching stock quote:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current stock price (simplified function for portfolio)
  // Uses cache-first approach to reduce API calls
  async getStockPrice(symbol, skipCache = false) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return null;
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // Check cache first (unless explicitly skipped)
      if (!skipCache) {
        const cachedQuote = await stockQuoteCacheServices.getCachedQuote(upperSymbol);
        if (cachedQuote) {
          console.log(`📦 Cache hit for ${upperSymbol} (age: ${Math.round((new Date() - new Date(cachedQuote.updatedAt)) / 1000 / 60)} min)`);
          return {
            price: cachedQuote.price,
            change: cachedQuote.change,
            changePercent: cachedQuote.changePercent
          };
        }
      }

      console.log(`🌐 Fetching stock price from API for ${upperSymbol}...`);

      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        console.error('getStockPrice error:', data['Error Message']);
        return null;
      }

      if (data['Note']) {
        console.error('getStockPrice rate limit:', data['Note']);
        return null;
      }

      const quote = data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        console.error('No quote data found for:', upperSymbol);
        return null;
      }

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = quote['10. change percent'];
      const parsedChangePercent = changePercent ? parseFloat(changePercent.replace('%', '')) : 0;

      // Cache the result
      await stockQuoteCacheServices.cacheQuote({
        ticker: upperSymbol,
        price: price,
        change: change,
        changePercent: parsedChangePercent,
        volume: parseInt(quote['06. volume']) || null,
        previousClose: parseFloat(quote['08. previous close']) || null,
        open: parseFloat(quote['02. open']) || null,
        high: parseFloat(quote['03. high']) || null,
        low: parseFloat(quote['04. low']) || null,
        lastTradingDay: quote['07. latest trading day'] || null
      });

      return {
        price: price,
        change: change,
        changePercent: parsedChangePercent
      };
    } catch (error) {
      console.error('Error getting stock price:', error);
      return null;
    }
  },

  // Update stale cache quotes with rate-limited API calls
  // This should be called BEFORE reading from cache for portfolio calculations
  // All API calls go through the global queue which handles rate limiting
  async updateStaleCacheQuotes(staleTickers) {
    if (!staleTickers || staleTickers.length === 0) {
      return { success: true, updated: 0 };
    }

    if (!ALPHA_VANTAGE_API_KEY) {
      console.warn('Alpha Vantage API key not configured, cannot update cache');
      return { success: false, error: 'API key not configured', updated: 0 };
    }

    console.log(`🔄 Updating cache for ${staleTickers.length} stale tickers (queued)...`);
    const quotesToCache = [];
    let rateLimitHit = false;

    for (let i = 0; i < staleTickers.length; i++) {
      const symbol = staleTickers[i].toUpperCase();

      // Rate limiting is handled by the global API queue - no manual delay needed

      try {
        const response = await queuedFetch(
          `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );

        if (!response.ok) {
          console.error(`HTTP error for ${symbol}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data['Error Message']) {
          console.error(`API error for ${symbol}:`, data['Error Message']);
          continue;
        }

        if (data['Note']) {
          console.warn('⚠️ Rate limit warning:', data['Note']);
          rateLimitHit = true;
          break;
        }

        if (data['Information'] && data['Information'].includes('API')) {
          console.warn('⚠️ Rate limit warning (Information):', data['Information']);
          rateLimitHit = true;
          break;
        }

        const quote = data['Global Quote'];
        if (quote && Object.keys(quote).length > 0) {
          const price = parseFloat(quote['05. price']);

          if (!Number.isFinite(price)) {
            console.warn(`⚠️ Invalid price for ${symbol}, skipping`);
            continue;
          }

          const change = parseFloat(quote['09. change']);
          const changePercent = quote['10. change percent'];
          const parsedChangePercent = changePercent ? parseFloat(changePercent.replace('%', '')) : null;

          quotesToCache.push({
            ticker: symbol,
            price: price,
            change: Number.isFinite(change) ? change : null,
            changePercent: Number.isFinite(parsedChangePercent) ? parsedChangePercent : null,
            volume: parseInt(quote['06. volume']) || null,
            previousClose: parseFloat(quote['08. previous close']) || null,
            open: parseFloat(quote['02. open']) || null,
            high: parseFloat(quote['03. high']) || null,
            low: parseFloat(quote['04. low']) || null,
            lastTradingDay: quote['07. latest trading day'] || null
          });

          console.log(`✓ Updated ${symbol}: $${price.toFixed(2)}`);
        } else {
          console.warn(`⚠️ Empty quote response for ${symbol}`);
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }

    // Batch cache all fetched quotes
    if (quotesToCache.length > 0) {
      await stockQuoteCacheServices.cacheQuotes(quotesToCache);
      console.log(`💾 Cached ${quotesToCache.length} updated quotes`);
    }

    return {
      success: !rateLimitHit,
      updated: quotesToCache.length,
      rateLimitHit
    };
  },

  // Batch fetch stock prices with rate limiting and caching
  // This is the preferred method for fetching multiple stock prices (e.g., portfolio positions)
  async getBatchStockPrices(symbols) {
    if (!symbols || symbols.length === 0) {
      return {};
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    const results = {};

    try {
      // Step 1: Check cache for all symbols
      console.log(`📦 Checking cache for ${upperSymbols.length} symbols...`);
      const cachedQuotes = await stockQuoteCacheServices.getCachedQuotes(upperSymbols);

      // Separate symbols into cached (fresh) and uncached
      const uncachedSymbols = [];

      upperSymbols.forEach(symbol => {
        if (cachedQuotes[symbol]) {
          results[symbol] = {
            price: cachedQuotes[symbol].price,
            change: cachedQuotes[symbol].change,
            changePercent: cachedQuotes[symbol].changePercent
          };
          console.log(`✓ Cache hit for ${symbol}`);
        } else {
          uncachedSymbols.push(symbol);
        }
      });

      console.log(`📊 Cache: ${Object.keys(cachedQuotes).length} hits, ${uncachedSymbols.length} misses`);

      // Step 2: Fetch uncached symbols from API (rate limiting handled by global queue)
      if (uncachedSymbols.length > 0 && ALPHA_VANTAGE_API_KEY) {
        console.log(`🌐 Fetching ${uncachedSymbols.length} symbols from API (queued)...`);

        const quotesToCache = [];

        // Process symbols - rate limiting is handled by the global API queue
        for (let i = 0; i < uncachedSymbols.length; i++) {
          const symbol = uncachedSymbols[i];

          // Rate limiting is handled by the global API queue - no manual delay needed

          try {
            const response = await queuedFetch(
              `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
            );

            if (!response.ok) {
              console.error(`HTTP error for ${symbol}: ${response.status}`);
              continue;
            }

            const data = await response.json();

            if (data['Error Message']) {
              console.error(`API error for ${symbol}:`, data['Error Message']);
              continue;
            }

            if (data['Note']) {
              console.warn('⚠️ Rate limit warning:', data['Note']);
              // If we hit rate limit, stop making more requests
              break;
            }

            // Check for Alpha Vantage information message (another form of rate limit)
            if (data['Information'] && data['Information'].includes('API')) {
              console.warn('⚠️ Rate limit warning (Information):', data['Information']);
              // If we hit rate limit, stop making more requests
              break;
            }

            const quote = data['Global Quote'];
            if (quote && Object.keys(quote).length > 0) {
              const price = parseFloat(quote['05. price']);

              // Skip quotes with invalid prices
              if (!Number.isFinite(price)) {
                console.warn(`⚠️ Invalid price for ${symbol}, skipping`);
                continue;
              }

              const change = parseFloat(quote['09. change']);
              const changePercent = quote['10. change percent'];
              const parsedChangePercent = changePercent ? parseFloat(changePercent.replace('%', '')) : null;

              results[symbol] = {
                price: price,
                change: Number.isFinite(change) ? change : null,
                changePercent: Number.isFinite(parsedChangePercent) ? parsedChangePercent : null
              };

              // Collect for batch cache update
              quotesToCache.push({
                ticker: symbol,
                price: price,
                change: Number.isFinite(change) ? change : null,
                changePercent: Number.isFinite(parsedChangePercent) ? parsedChangePercent : null,
                volume: parseInt(quote['06. volume']) || null,
                previousClose: parseFloat(quote['08. previous close']) || null,
                open: parseFloat(quote['02. open']) || null,
                high: parseFloat(quote['03. high']) || null,
                low: parseFloat(quote['04. low']) || null,
                lastTradingDay: quote['07. latest trading day'] || null
              });

              console.log(`✓ Fetched ${symbol}: $${price.toFixed(2)}, change: ${change}, changePercent: ${parsedChangePercent}`);
            } else {
              console.warn(`⚠️ Empty quote response for ${symbol}:`, JSON.stringify(data));
            }
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
          }
        }

        // Cache all fetched quotes in one batch
        if (quotesToCache.length > 0) {
          await stockQuoteCacheServices.cacheQuotes(quotesToCache);
          console.log(`💾 Cached ${quotesToCache.length} quotes`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in getBatchStockPrices:', error);
      return results; // Return whatever we have
    }
  },

  // Get company overview (fundamentals)
  async getCompanyOverview(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }

      if (data['Note']) {
        return { success: false, error: 'API rate limit exceeded. Please try again later.' };
      }

      if (!data.Symbol) {
        return { success: false, error: 'No company data found for this symbol' };
      }

      const marketCap = parseNullableNumber(data.MarketCapitalization);
      const totalDebt = parseNullableNumber(data.TotalDebt);
      const cashAndEquivalents = parseNullableNumber(data.CashAndCashEquivalents);
      const enterpriseValueRaw = parseNullableNumber(data.EnterpriseValue);

      return {
        success: true,
        data: {
          symbol: data.Symbol,
          name: data.Name,
          description: data.Description,
          exchange: data.Exchange,
          currency: data.Currency,
          country: data.Country,
          sector: data.Sector,
          industry: data.Industry,
          marketCap,
          enterpriseValue: computeEnterpriseValue(enterpriseValueRaw, marketCap, totalDebt, cashAndEquivalents),
          peRatio: parseNullableNumber(data.PERatio),
          priceToBook: parseNullableNumber(data.PriceToBookRatio),
          dividendYield: parseNullableNumber(data.DividendYield),
          eps: parseNullableNumber(data.EPS),
          beta: parseNullableNumber(data.Beta),
          fiftyTwoWeekHigh: parseNullableNumber(data['52WeekHigh']),
          fiftyTwoWeekLow: parseNullableNumber(data['52WeekLow']),
          fiftyDayAverage: parseNullableNumber(data['50DayMovingAverage']),
          twoHundredDayAverage: parseNullableNumber(data['200DayMovingAverage']),
          // Additional valuation metrics
          evToEbitda: parseNullableNumber(data.EVToEBITDA),
          evToRevenue: parseNullableNumber(data.EVToRevenue),
          evToEBIT: parseNullableNumber(data.EVToEBIT),
          // Financial metrics
          revenue: parseNullableNumber(data.RevenueTTM),
          ebitda: parseNullableNumber(data.EBITDA),
          ebit: parseNullableNumber(data.EBIT),
          netIncome: parseNullableNumber(data.NetIncomeTTM),
          totalDebt,
          cashAndEquivalents
        }
      };
    } catch (error) {
      console.error('Error fetching company overview:', error);
      return { success: false, error: error.message };
    }
  },

  // Get income statement
  async getIncomeStatement(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }

      if (data['Note']) {
        return { success: false, error: 'API rate limit exceeded. Please try again later.' };
      }

      return {
        success: true,
        data: {
          annualReports: data.annualReports || [],
          quarterlyReports: data.quarterlyReports || []
        }
      };
    } catch (error) {
      console.error('Error fetching income statement:', error);
      return { success: false, error: error.message };
    }
  },

  // Get balance sheet
  async getBalanceSheet(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }

      if (data['Note']) {
        return { success: false, error: 'API rate limit exceeded. Please try again later.' };
      }

      return {
        success: true,
        data: {
          annualReports: data.annualReports || [],
          quarterlyReports: data.quarterlyReports || []
        }
      };
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      return { success: false, error: error.message };
    }
  },

  // Get cash flow statement
  async getCashFlow(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=CASH_FLOW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }

      if (data['Note']) {
        return { success: false, error: 'API rate limit exceeded. Please try again later.' };
      }

      return {
        success: true,
        data: {
          annualReports: data.annualReports || [],
          quarterlyReports: data.quarterlyReports || []
        }
      };
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      return { success: false, error: error.message };
    }
  },

  // Get earnings calendar
  async getEarningsCalendar(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=EARNINGS_CALENDAR&symbol=${symbol}&horizon=3month&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawText = await response.text();
      let parsedBody;
      try {
        parsedBody = parseEarningsCalendarBody(rawText);
      } catch (parseError) {
        console.error('Unable to parse earnings calendar payload:', parseError);
        return { success: false, error: 'Unable to parse earnings calendar response.' };
      }

      if (!parsedBody) {
        return { success: false, error: 'No earnings calendar data returned.' };
      }

      const isObject = !Array.isArray(parsedBody) && typeof parsedBody === 'object';
      const errorMessage = isObject
        ? parsedBody['Error Message'] ||
          parsedBody['Information'] ||
          parsedBody['Note'] ||
          parsedBody.message
        : null;

      if (errorMessage) {
        return { success: false, error: errorMessage };
      }

      const normalized =
        Array.isArray(parsedBody)
          ? parsedBody
          : parsedBody.earningsCalendar ||
            parsedBody.earnings ||
            parsedBody.data ||
            [];

      return {
        success: true,
        data: normalized
      };
    } catch (error) {
      console.error('Error fetching earnings calendar:', error);
      return { success: false, error: error.message };
    }
  },

  // Get historical daily prices
  async getHistoricalPrices(symbol, outputsize = 'full') {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await queuedFetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }

      if (data['Note']) {
        return { success: false, error: 'API rate limit exceeded. Please try again later.', rateLimited: true };
      }

      // Check for Alpha Vantage "Information" message (another form of rate limit)
      if (data['Information'] && data['Information'].includes('API')) {
        console.warn('⚠️ Historical prices rate limit (Information):', data['Information']);
        return { success: false, error: 'API rate limit exceeded. Please try again later.', rateLimited: true };
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        return { success: false, error: 'No historical data found for this symbol' };
      }
      
      // Convert to array of { date, price } sorted by date
      const prices = Object.entries(timeSeries).map(([date, values]) => ({
        date: date,
        price: parseFloat(values['4. close']),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        volume: parseInt(values['5. volume'])
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        success: true,
        data: prices
      };
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return { success: false, error: error.message };
    }
  }
};