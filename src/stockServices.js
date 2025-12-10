// Stock Services - Alpha Vantage API Integration
const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

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
      const response = await fetch(
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
      const response = await fetch(
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
  async getStockQuote(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      console.log(`Fetching stock quote for ${symbol}...`);
      console.log('Using API key:', ALPHA_VANTAGE_API_KEY.substring(0, 8) + '...');
      
      // Try GLOBAL_QUOTE first (more reliable for free tier)
      console.log('Trying GLOBAL_QUOTE endpoint...');
      const quoteResponse = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!quoteResponse.ok) {
        throw new Error(`HTTP error! status: ${quoteResponse.status}`);
      }
      
      const quoteData = await quoteResponse.json();
      console.log('GLOBAL_QUOTE response:', quoteData);
      console.log('GLOBAL_QUOTE response keys:', Object.keys(quoteData));
      
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
        console.log('No GLOBAL_QUOTE data, trying TIME_SERIES_INTRADAY...');
        
        // Fallback to TIME_SERIES_INTRADAY
        const response = await fetch(
          `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('TIME_SERIES_INTRADAY response:', data);
        console.log('TIME_SERIES_INTRADAY response keys:', Object.keys(data));
        
        if (data['Error Message']) {
          return { success: false, error: data['Error Message'] };
        }
        
        if (data['Note']) {
          return { success: false, error: `API rate limit exceeded: ${data['Note']}` };
        }
        
        // Check for Alpha Vantage information message (rate limit)
        if (data['Information'] && data['Information'].includes('API key')) {
          console.log('Alpha Vantage rate limit detected:', data['Information']);
          return { 
            success: false, 
            error: `Alpha Vantage free tier limit reached. Please wait a few minutes and try again, or upgrade to premium for unlimited access.` 
          };
        }
        
        // Check if we have time series data
        const timeSeriesData = data['Time Series (1min)'];
        if (!timeSeriesData || Object.keys(timeSeriesData).length === 0) {
          return { success: false, error: `No data found for symbol: ${symbol}. This could be due to rate limits or the symbol not being available in the free tier. Try again in a few minutes.` };
        }
        
        // Parse TIME_SERIES_INTRADAY data
        const latestTime = Object.keys(timeSeriesData)[0];
        const latestData = timeSeriesData[latestTime];
        
        console.log('Latest time series data:', latestData);
        
        return {
          success: true,
          data: {
            symbol: symbol,
            price: parseFloat(latestData['4. close']),
            change: 0, // We'll calculate this if needed
            changePercent: '0.00%', // We'll calculate this if needed
            volume: parseInt(latestData['5. volume']),
            previousClose: parseFloat(latestData['4. close']), // Same as current for now
            open: parseFloat(latestData['1. open']),
            high: parseFloat(latestData['2. high']),
            low: parseFloat(latestData['3. low']),
            lastUpdated: latestTime
          }
        };
      }
      
      console.log('GLOBAL_QUOTE data found:', quote);
      
      return {
        success: true,
        data: {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: quote['10. change percent'],
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
  async getStockPrice(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return null;
    }

    try {
      console.log(`Getting stock price for ${symbol}...`);
      
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('getStockPrice response:', data);
      
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
        console.error('No quote data found for:', symbol);
        return null;
      }
      
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = quote['10. change percent'];
      
      return {
        price: price,
        change: change,
        changePercent: changePercent ? parseFloat(changePercent.replace('%', '')) : 0
      };
    } catch (error) {
      console.error('Error getting stock price:', error);
      return null;
    }
  },

  // Get company overview (fundamentals)
  async getCompanyOverview(symbol) {
    if (!ALPHA_VANTAGE_API_KEY) {
      return { success: false, error: 'Alpha Vantage API key not configured' };
    }

    try {
      const response = await fetch(
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
          marketCap: parseNullableNumber(data.MarketCapitalization),
          enterpriseValue: parseNullableNumber(data.EnterpriseValue) || parseNullableNumber(data.MarketCapitalization), // Use EV if available, otherwise use market cap
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
          totalDebt: parseNullableNumber(data.TotalDebt),
          cashAndEquivalents: parseNullableNumber(data.CashAndCashEquivalents)
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
      const response = await fetch(
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
      const response = await fetch(
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
      const response = await fetch(
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
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=EARNINGS_CALENDAR&symbol=${symbol}&horizon=3month&apikey=${ALPHA_VANTAGE_API_KEY}`
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
        data: data
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
      const response = await fetch(
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
        return { success: false, error: 'API rate limit exceeded. Please try again later.' };
      }
      
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        return { success: false, error: 'No historical data found' };
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