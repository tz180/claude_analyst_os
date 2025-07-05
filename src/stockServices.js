// Stock Services - Alpha Vantage API Integration
const ALPHA_VANTAGE_API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Check if API key is configured
if (!ALPHA_VANTAGE_API_KEY) {
  console.warn('Alpha Vantage API key not found. Please set REACT_APP_ALPHA_VANTAGE_API_KEY in your .env file');
}

export const stockServices = {
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
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Alpha Vantage response:', data);
      
      if (data['Error Message']) {
        return { success: false, error: data['Error Message'] };
      }
      
      if (data['Note']) {
        return { success: false, error: `API rate limit exceeded: ${data['Note']}` };
      }
      
      const quote = data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        return { success: false, error: `No data found for symbol: ${symbol}. This could be due to rate limits or the symbol not being available in the free tier.` };
      }
      
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
          marketCap: data.MarketCapitalization,
          peRatio: data.PERatio,
          priceToBook: data.PriceToBookRatio,
          dividendYield: data.DividendYield,
          eps: data.EPS,
          beta: data.Beta,
          fiftyTwoWeekHigh: data['52WeekHigh'],
          fiftyTwoWeekLow: data['52WeekLow'],
          fiftyDayAverage: data['50DayMovingAverage'],
          twoHundredDayAverage: data['200DayMovingAverage']
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
  }
}; 