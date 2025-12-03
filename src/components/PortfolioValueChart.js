import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { stockServices } from '../stockServices';
import { historicalPriceServices } from '../supabaseServices';

// Fed interest rates (approximate - you could fetch this from an API)
// Using current Fed Funds Rate as base for cash interest
const FED_FUNDS_RATE = 0.0525; // 5.25% annual (as of 2024)
const CASH_INTEREST_RATE = FED_FUNDS_RATE * 0.8; // 80% of Fed rate for cash accounts (4.2% annual)

const PortfolioValueChart = ({ portfolio, positions, transactions, currentPrices }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historicalPrices, setHistoricalPrices] = useState({}); // { ticker: [{ date, price }] }

  // Fetch historical prices for all positions
  useEffect(() => {
    const fetchHistoricalPrices = async () => {
      if (!positions || positions.length === 0) {
        setHistoricalPrices({});
        return;
      }

      setLoading(true);
      const priceMap = {};

      // Get unique tickers from positions
      const tickers = [...new Set(positions.map(p => p.ticker))];

      // Calculate date range we need (last 5 years should be enough)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch historical prices for each ticker
      for (const ticker of tickers) {
        try {
          // First, try to get from database
          let prices = [];
          const dbResult = await historicalPriceServices.getHistoricalPrices(ticker, startDateStr, endDate);
          
          if (dbResult.success && dbResult.data && dbResult.data.length > 0) {
            // We have data in the database, use it
            prices = dbResult.data;
            console.log(`Loaded ${prices.length} historical prices for ${ticker} from database`);
          } else {
            // No data in database, fetch from API
            console.log(`No database cache for ${ticker}, fetching from API...`);
            const apiResult = await stockServices.getHistoricalPrices(ticker, 'full');
            
            if (apiResult.success && apiResult.data) {
              prices = apiResult.data;
              
              // Store in database for future use
              const storeResult = await historicalPriceServices.storeHistoricalPrices(ticker, prices);
              if (storeResult.success) {
                console.log(`Stored ${prices.length} historical prices for ${ticker} in database`);
              } else {
                console.warn(`Failed to store historical prices for ${ticker}:`, storeResult.error);
              }
            } else {
              console.warn(`Failed to fetch historical prices for ${ticker} from API:`, apiResult.error);
            }
          }

          // Create a map for quick lookup: date -> price
          if (prices.length > 0) {
            const priceByDate = {};
            prices.forEach(({ date, price }) => {
              priceByDate[date] = price;
            });
            priceMap[ticker] = priceByDate;
          } else {
            priceMap[ticker] = {};
          }
        } catch (error) {
          console.error(`Error fetching historical prices for ${ticker}:`, error);
          priceMap[ticker] = {};
        }
      }

      setHistoricalPrices(priceMap);
      setLoading(false);
    };

    fetchHistoricalPrices();
  }, [positions]);

  // Calculate portfolio value over time
  const calculatePortfolioHistory = useMemo(() => {
    // Helper function to get price for a ticker on a specific date
    const getPriceForDate = (ticker, dateStr) => {
      // First try historical prices
      if (historicalPrices[ticker] && historicalPrices[ticker][dateStr]) {
        return historicalPrices[ticker][dateStr];
      }
      
      // If no historical price for exact date, find the most recent price before or on that date
      if (historicalPrices[ticker]) {
        const dates = Object.keys(historicalPrices[ticker]).sort().reverse();
        for (const date of dates) {
          if (date <= dateStr) {
            return historicalPrices[ticker][date];
          }
        }
      }
      
      // Fallback to current price if available
      if (currentPrices[ticker]) {
        return currentPrices[ticker];
      }
      
      // Last resort: return null (will use average cost)
      return null;
    };
    if (!portfolio || !transactions || transactions.length === 0) {
      return [];
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
    );

    if (sortedTransactions.length === 0) return [];

    const startDate = new Date(sortedTransactions[0].transaction_date);
    const endDate = new Date();
    const dataPoints = [];

    // Get period start date
    let periodStartDate = new Date();
    switch (selectedPeriod) {
      case '1M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 1);
        break;
      case '3M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 3);
        break;
      case '6M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 6);
        break;
      case 'YTD':
        periodStartDate = new Date(new Date().getFullYear(), 0, 1);
        break;
      case '1Y':
        periodStartDate.setFullYear(periodStartDate.getFullYear() - 1);
        break;
      case '5Y':
        periodStartDate.setFullYear(periodStartDate.getFullYear() - 5);
        break;
      default:
        periodStartDate.setFullYear(periodStartDate.getFullYear() - 1);
    }

    // Use the later of period start or first transaction
    const actualStartDate = startDate > periodStartDate ? startDate : periodStartDate;

    // Calculate daily data points
    let currentDate = new Date(actualStartDate);
    let runningCash = portfolio.starting_cash || 50000000;
    const positionHistory = {}; // Track positions over time: { ticker: { shares, totalCost } }
    let transactionIndex = 0; // Track which transactions we've processed
    const portfolioStartDate = new Date(portfolio.created_at || actualStartDate);
    let lastCashUpdateDate = new Date(portfolioStartDate);
    let totalInterestEarned = 0;
    const dailyInterestRate = CASH_INTEREST_RATE / 365;

    // Process transactions and calculate portfolio value at each point
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Process transactions that occurred on or before this date
      while (transactionIndex < sortedTransactions.length) {
        const tx = sortedTransactions[transactionIndex];
        const txDate = new Date(tx.transaction_date).toISOString().split('T')[0];
        
        if (txDate > dateStr) {
          break; // This transaction is in the future, stop processing
        }
        
        // Calculate interest on cash up to this transaction date
        const daysSinceLastUpdate = Math.floor((new Date(txDate) - lastCashUpdateDate) / (1000 * 60 * 60 * 24));
        if (daysSinceLastUpdate > 0) {
          totalInterestEarned += runningCash * dailyInterestRate * daysSinceLastUpdate;
        }
        lastCashUpdateDate = new Date(txDate);
        
        if (tx.transaction_type === 'buy') {
          runningCash -= tx.total_amount;
          if (!positionHistory[tx.ticker]) {
            positionHistory[tx.ticker] = { shares: 0, totalCost: 0 };
          }
          positionHistory[tx.ticker].shares += tx.shares;
          positionHistory[tx.ticker].totalCost += tx.total_amount;
        } else if (tx.transaction_type === 'sell') {
          runningCash += tx.total_amount;
          if (positionHistory[tx.ticker]) {
            // Calculate average cost for remaining shares
            const avgCost = positionHistory[tx.ticker].totalCost / positionHistory[tx.ticker].shares;
            positionHistory[tx.ticker].shares -= tx.shares;
            positionHistory[tx.ticker].totalCost = positionHistory[tx.ticker].shares * avgCost;
            if (positionHistory[tx.ticker].shares <= 0) {
              delete positionHistory[tx.ticker];
            }
          }
        }
        
        transactionIndex++;
      }

      // Calculate interest from last update to current date
      const daysSinceLastUpdate = Math.floor((currentDate - lastCashUpdateDate) / (1000 * 60 * 60 * 24));
      const interestSinceLastUpdate = runningCash * dailyInterestRate * Math.max(0, daysSinceLastUpdate);
      const currentInterestEarned = totalInterestEarned + interestSinceLastUpdate;

      // Calculate portfolio value at this date
      let positionsValue = 0;
      Object.entries(positionHistory).forEach(([ticker, pos]) => {
        if (pos.shares > 0) {
          // Use historical price for this date, fallback to average cost
          const price = getPriceForDate(ticker, dateStr) || (pos.totalCost / pos.shares);
          positionsValue += pos.shares * price;
        }
      });

      const cashWithInterest = runningCash + currentInterestEarned;

      const totalValue = positionsValue + cashWithInterest;

      dataPoints.push({
        date: dateStr,
        totalValue: totalValue,
        positionsValue: positionsValue,
        cash: runningCash,
        cashWithInterest: cashWithInterest,
        interestEarned: currentInterestEarned
      });

      // Move to next day (or week/month for longer periods)
      if (selectedPeriod === '5Y') {
        currentDate.setDate(currentDate.getDate() + 7); // Weekly for 5Y
      } else if (selectedPeriod === '1Y') {
        currentDate.setDate(currentDate.getDate() + 1); // Daily for 1Y
      } else {
        currentDate.setDate(currentDate.getDate() + 1); // Daily for shorter periods
      }
    }

    return dataPoints;
  }, [portfolio, transactions, selectedPeriod, currentPrices, historicalPrices]);

  useEffect(() => {
    setHistoricalData(calculatePortfolioHistory);
  }, [calculatePortfolioHistory]);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (selectedPeriod === '5Y') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else if (selectedPeriod === '1Y') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate current vs start value
  const currentValue = historicalData.length > 0 
    ? historicalData[historicalData.length - 1]?.totalValue || 0
    : 0;
  const startValue = historicalData.length > 0 
    ? historicalData[0]?.totalValue || 0
    : 0;
  const change = currentValue - startValue;
  const changePercent = startValue > 0 ? ((change / startValue) * 100) : 0;

  // Calculate total interest earned
  const totalInterestEarned = historicalData.length > 0
    ? historicalData[historicalData.length - 1]?.interestEarned || 0
    : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{formatDate(data.date)}</p>
          <p className="text-sm">
            <span className="text-gray-600">Total Value: </span>
            <span className="font-semibold">{formatCurrency(data.totalValue)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Positions: </span>
            <span className="font-semibold">{formatCurrency(data.positionsValue)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Cash: </span>
            <span className="font-semibold">{formatCurrency(data.cash)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Interest Earned: </span>
            <span className="font-semibold text-green-600">{formatCurrency(data.interestEarned)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const periods = [
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: '5Y', value: '5Y' }
  ];

  if (historicalData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="mr-2" size={20} />
          Portfolio Value Over Time
        </h3>
        <div className="text-center py-8 text-gray-500">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading historical price data...</p>
            </>
          ) : (
            <>
              <p>No transaction history available yet.</p>
              <p className="text-sm mt-2">Make some trades to see your portfolio value chart!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <TrendingUp className="mr-2" size={20} />
          Portfolio Value Over Time
        </h3>
        <div className="flex items-center space-x-2">
          <Calendar className="text-gray-500" size={16} />
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Current Value</p>
          <p className="text-xl font-bold text-blue-600">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(currentValue)}
          </p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Period Change</p>
          <p className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(change)}
          </p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Period Return</p>
          <p className={`text-xl font-bold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-gray-600">Interest Earned</p>
          <p className="text-xl font-bold text-orange-600">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(totalInterestEarned)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalValue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Total Value"
            />
            <Line
              type="monotone"
              dataKey="positionsValue"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="Positions Value"
            />
            <Line
              type="monotone"
              dataKey="cashWithInterest"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="Cash + Interest"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Cash interest calculated at {(CASH_INTEREST_RATE * 100).toFixed(2)}% annual rate (based on Fed Funds Rate).</p>
        <p>Historical values use actual historical stock prices to show portfolio value fluctuations over time.</p>
        {loading && <p className="text-blue-600 mt-1">Loading historical price data...</p>}
      </div>
    </div>
  );
};

export default PortfolioValueChart;

