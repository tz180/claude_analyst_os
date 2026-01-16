import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { stockServices } from '../stockServices';
import { historicalPriceServices, historicalPortfolioValueServices } from '../supabaseServices';

// Fed interest rates (approximate - you could fetch this from an API)
// Using current Fed Funds Rate as base for cash interest
const FED_FUNDS_RATE = 0.0525; // 5.25% annual (as of 2024)
const CASH_INTEREST_RATE = FED_FUNDS_RATE * 0.8; // 80% of Fed rate for cash accounts (4.2% annual)

const PortfolioValueChart = ({ portfolio, positions, transactions, currentPrices }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historicalPrices, setHistoricalPrices] = useState({}); // { ticker: [{ date, price }] }
  const [storedHistoricalValues, setStoredHistoricalValues] = useState([]); // Pre-calculated portfolio values from DB

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
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Calculate yesterday's date (we need data up to yesterday since today's market may not be closed)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Small delay to let current quote fetching (in Portfolio.js) complete first
      // This helps avoid hitting API rate limits from simultaneous requests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch historical prices for each ticker
      for (const ticker of tickers) {
        try {
          let prices = [];

          // First, check what date range we have in the database
          const dateRangeResult = await historicalPriceServices.getDateRange(ticker);
          const latestDateInDb = dateRangeResult.success ? dateRangeResult.latestDate : null;

          console.log(`📊 ${ticker}: Latest date in DB: ${latestDateInDb || 'none'}, Yesterday: ${yesterdayStr}`);

          if (!latestDateInDb) {
            // No data in database at all, fetch full historical data from API
            console.log(`No database cache for ${ticker}, fetching full history from API...`);
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
              // No data in DB and API failed - nothing we can do
              if (apiResult.rateLimited) {
                console.warn(`⏳ ${ticker}: No data in DB and rate limited - will retry on next load`);
              } else {
                console.warn(`⚠️ ${ticker}: No data in DB and API failed: ${apiResult.error}`);
              }
            }
          } else if (latestDateInDb < yesterdayStr) {
            // We have data but it's outdated - fetch only the missing dates
            console.log(`${ticker}: DB data ends at ${latestDateInDb}, need to fetch up to ${yesterdayStr}`);

            // First, get existing data from database
            const dbResult = await historicalPriceServices.getHistoricalPrices(ticker, startDateStr, endDate);
            if (dbResult.success && dbResult.data) {
              prices = dbResult.data;
              console.log(`Loaded ${prices.length} existing prices for ${ticker} from database`);
            }

            // Fetch recent data from API (compact = last 100 trading days, ~4-5 months)
            // This is sufficient for filling in gaps and more efficient than full history
            const apiResult = await stockServices.getHistoricalPrices(ticker, 'compact');

            if (apiResult.success && apiResult.data) {
              // Filter to only get dates after our latest DB date
              const newPrices = apiResult.data.filter(p => p.date > latestDateInDb);

              if (newPrices.length > 0) {
                console.log(`Fetched ${newPrices.length} new prices for ${ticker} from API (${newPrices[0].date} to ${newPrices[newPrices.length - 1].date})`);

                // Store only the new prices in database
                const storeResult = await historicalPriceServices.storeHistoricalPrices(ticker, newPrices);
                if (storeResult.success) {
                  console.log(`Stored ${newPrices.length} new prices for ${ticker} in database`);
                } else {
                  console.warn(`Failed to store new prices for ${ticker}:`, storeResult.error);
                }

                // Combine existing and new prices
                prices = [...prices, ...newPrices];
              } else {
                console.log(`No new prices needed for ${ticker} (API data doesn't extend beyond ${latestDateInDb})`);
              }
            } else {
              // API failed but we still have existing data - use it as fallback
              if (apiResult.rateLimited) {
                console.warn(`⏳ ${ticker}: Rate limited, using existing ${prices.length} prices from database (up to ${latestDateInDb})`);
              } else {
                console.warn(`⚠️ ${ticker}: API error (${apiResult.error}), using existing ${prices.length} prices from database (up to ${latestDateInDb})`);
              }
            }
          } else {
            // Database data is up to date, just use it
            console.log(`${ticker}: DB data is current (${latestDateInDb}), using cached data`);
            const dbResult = await historicalPriceServices.getHistoricalPrices(ticker, startDateStr, endDate);

            if (dbResult.success && dbResult.data && dbResult.data.length > 0) {
              prices = dbResult.data;
              console.log(`Loaded ${prices.length} historical prices for ${ticker} from database`);
            }
          }

          // Create a map for quick lookup: date -> price
          if (prices.length > 0) {
            const priceByDate = {};
            prices.forEach(({ date, price }) => {
              // Ensure date is in YYYY-MM-DD format (handle both date strings and Date objects)
              const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
              priceByDate[dateStr] = price;
            });
            priceMap[ticker] = priceByDate;
            const dateKeys = Object.keys(priceByDate).sort();
            console.log(`✓ Mapped ${prices.length} prices for ${ticker}, date range: ${dateKeys[0]} to ${dateKeys[dateKeys.length - 1]}`);
            console.log(`  Sample dates: ${dateKeys.slice(0, 3).join(', ')}, ... ${dateKeys.slice(-3).join(', ')}`);
          } else {
            console.warn(`⚠ No prices loaded for ${ticker}`);
            priceMap[ticker] = {};
          }
        } catch (error) {
          console.error(`Error fetching historical prices for ${ticker}:`, error);
          priceMap[ticker] = {};
        }
      }

      setHistoricalPrices(priceMap);
      setLoading(false);
      console.log('Historical prices loaded:', Object.keys(priceMap).length, 'tickers');
    };

    fetchHistoricalPrices();
  }, [positions]);

  // Fetch pre-calculated historical portfolio values from database
  useEffect(() => {
    const fetchStoredHistoricalValues = async () => {
      if (!portfolio?.id) {
        setStoredHistoricalValues([]);
        return;
      }

      try {
        // Calculate date range based on selected period
        let startDate = null;
        const endDate = new Date().toISOString().split('T')[0];
        
        switch (selectedPeriod) {
          case '1M':
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            startDate = oneMonthAgo.toISOString().split('T')[0];
            break;
          case '3M':
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            startDate = threeMonthsAgo.toISOString().split('T')[0];
            break;
          case '6M':
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            startDate = sixMonthsAgo.toISOString().split('T')[0];
            break;
          case 'YTD':
            startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
          case '1Y':
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            startDate = oneYearAgo.toISOString().split('T')[0];
            break;
          case '5Y':
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            startDate = fiveYearsAgo.toISOString().split('T')[0];
            break;
          default:
            // Default to all time (no start date filter)
            break;
        }

        const result = await historicalPortfolioValueServices.getHistoricalValues(
          portfolio.id,
          startDate,
          endDate
        );

        if (result.success && result.data && result.data.length > 0) {
          // Transform the data to match the chart format
          const chartData = result.data.map(item => ({
            date: item.date,
            totalValue: item.totalValue,
            positionsValue: item.positionsValue,
            cash: item.cash,
            cashWithInterest: item.cash + item.interestEarned,
            interestEarned: item.interestEarned
          }));
          
          setStoredHistoricalValues(chartData);
          console.log(`✓ Loaded ${chartData.length} stored historical portfolio values from database`);
        } else {
          console.log('No stored historical portfolio values found, will calculate on the fly');
          setStoredHistoricalValues([]);
        }
      } catch (error) {
        console.error('Error fetching stored historical portfolio values:', error);
        setStoredHistoricalValues([]);
      }
    };

    fetchStoredHistoricalValues();
  }, [portfolio?.id, selectedPeriod]);

  // Calculate portfolio value over time (fallback if no stored values)
  const calculatePortfolioHistory = useMemo(() => {
    // Don't calculate if we're still loading historical prices
    if (loading) {
      return [];
    }
    
    // Helper function to get price for a ticker on a specific date
    // Returns the closing price for that date (or most recent trading day before it)
    const getPriceForDate = (ticker, dateStr, isTodayDate) => {
      // For today, use current prices
      if (isTodayDate && currentPrices[ticker]) {
        return currentPrices[ticker];
      }
      
      // For historical dates, use historical closing prices
      if (!historicalPrices[ticker] || Object.keys(historicalPrices[ticker]).length === 0) {
        // No historical prices available for this ticker
        return null;
      }
      
      // Ensure dateStr is in YYYY-MM-DD format
      const normalizedDateStr = dateStr.split('T')[0];
      
      // First try exact date match (for trading days)
      if (historicalPrices[ticker][normalizedDateStr]) {
        return historicalPrices[ticker][normalizedDateStr];
      }
      
      // If no exact match (weekend/holiday), find the most recent trading day before or on that date
      // Sort dates in descending order to find the most recent one
      const dates = Object.keys(historicalPrices[ticker]).sort().reverse();
      for (const date of dates) {
        if (date <= normalizedDateStr) {
          // Found the most recent trading day before or on this date
          return historicalPrices[ticker][date];
        }
      }
      
      // If we get here, all historical prices are after this date
      // This means the date we're looking for is before any historical data we have
      // Return the earliest available price as a fallback
      if (dates.length > 0) {
        const earliestDate = dates[dates.length - 1];
        return historicalPrices[ticker][earliestDate];
      }
      
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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let isToday = false;
    
    console.log(`📅 Chart calculation: Today is ${todayStr}, Start date: ${actualStartDate.toISOString().split('T')[0]}, End date: ${endDate.toISOString().split('T')[0]}`);
    console.log(`📊 Historical prices loaded for tickers:`, Object.keys(historicalPrices));
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      isToday = dateStr === todayStr;
      
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
      // Formula: Sum of (shares owned * closing price on that date) for each position
      let positionsValue = 0;
      const currentIsToday = isToday; // Capture isToday for use in forEach
      const positionDetails = []; // Track individual position values for debugging
      
      Object.entries(positionHistory).forEach(([ticker, pos]) => {
        if (pos.shares > 0) {
          // Get the closing price for this date (or most recent trading day)
          const closingPrice = getPriceForDate(ticker, dateStr, currentIsToday);
          
          let positionValue = 0;
          if (closingPrice !== null && closingPrice > 0) {
            // Use the actual closing price: shares * closing price
            positionValue = pos.shares * closingPrice;
            positionsValue += positionValue;
            positionDetails.push({ ticker, shares: pos.shares, price: closingPrice, value: positionValue });
          } else {
            // Fallback: if no historical price available, use average cost
            // This should only happen if historical prices haven't loaded yet
            const avgCost = pos.totalCost / pos.shares;
            positionValue = pos.shares * avgCost;
            positionsValue += positionValue;
            
            // Log warning if we expected to have historical prices
            if (!currentIsToday && historicalPrices[ticker] && Object.keys(historicalPrices[ticker]).length > 0) {
              const availableDates = Object.keys(historicalPrices[ticker]).sort();
              console.warn(`⚠ Using average cost for ${ticker} on ${dateStr} - no price found. First available: ${availableDates[0]}, Last: ${availableDates[availableDates.length - 1]}`);
            }
          }
        }
      });
      
      // Debug: Log positions value calculation for first few dates to verify historical prices are being used
      if (dataPoints.length < 5) {
        console.log(`📊 ${dateStr} - Positions Value: $${positionsValue.toLocaleString()}, Details:`, positionDetails);
        // Also log what prices were found
        Object.entries(positionHistory).forEach(([ticker, pos]) => {
          if (pos.shares > 0) {
            const price = getPriceForDate(ticker, dateStr, currentIsToday);
            const hasHistorical = historicalPrices[ticker] && Object.keys(historicalPrices[ticker]).length > 0;
            const avgCost = pos.totalCost / pos.shares;
            const usedPrice = price !== null ? price : avgCost;
            const positionValue = pos.shares * usedPrice;
            
            if (hasHistorical) {
              const availableDates = Object.keys(historicalPrices[ticker]).sort();
              const firstDate = availableDates[0];
              const lastDate = availableDates[availableDates.length - 1];
              console.log(`  ${ticker}: ${pos.shares} shares × $${usedPrice.toFixed(2)} = $${positionValue.toLocaleString()}`);
              console.log(`    Historical prices available: ${availableDates.length} dates (${firstDate} to ${lastDate})`);
              console.log(`    Looking for date: ${dateStr}, Found price: ${price !== null ? `$${price.toFixed(2)}` : 'NULL (using avg cost)'}`);
            } else {
              console.log(`  ${ticker}: ${pos.shares} shares × $${usedPrice.toFixed(2)} = $${positionValue.toLocaleString()} (NO HISTORICAL DATA - using avg cost)`);
            }
          }
        });
      }

      // For today, use the same cash calculation as Portfolio.js
      let cashWithInterest;
      if (isToday && portfolio) {
        // Match Portfolio.js logic: use portfolio.current_cash if available
        const baseCash = (portfolio.current_cash !== null && portfolio.current_cash !== undefined && !Number.isNaN(portfolio.current_cash))
          ? portfolio.current_cash
          : runningCash;
        cashWithInterest = baseCash + currentInterestEarned;
      } else {
        cashWithInterest = runningCash + currentInterestEarned;
      }

      const totalValue = positionsValue + cashWithInterest;

      // Store data point with all calculated values
      // positionsValue = sum of (shares * closing price) for all positions on this date
      const dataPoint = {
        date: dateStr,
        totalValue: totalValue,
        positionsValue: positionsValue, // This is the key value: shares * closing price for each position
        cash: isToday && portfolio?.current_cash !== null && portfolio?.current_cash !== undefined ? portfolio.current_cash : runningCash,
        cashWithInterest: cashWithInterest,
        interestEarned: currentInterestEarned
      };
      
      dataPoints.push(dataPoint);

      // Move to next day (or week/month for longer periods)
      if (selectedPeriod === '5Y') {
        currentDate.setDate(currentDate.getDate() + 7); // Weekly for 5Y
      } else if (selectedPeriod === '1Y') {
        currentDate.setDate(currentDate.getDate() + 1); // Daily for 1Y
      } else {
        currentDate.setDate(currentDate.getDate() + 1); // Daily for shorter periods
      }
    }
    
    // Ensure we always have today's data point if it's not already included
    if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].date !== todayStr) {
      // Calculate today's value using current positions and prices
      let todayPositionsValue = 0;
      positions.forEach((position) => {
        const currentPrice = currentPrices[position.ticker];
        if (currentPrice) {
          todayPositionsValue += position.shares * currentPrice;
        }
      });
      
      // Calculate today's cash and interest (matching Portfolio.js logic)
      const baseCash = (portfolio?.current_cash !== null && portfolio?.current_cash !== undefined && !Number.isNaN(portfolio?.current_cash))
        ? portfolio.current_cash
        : (portfolio?.starting_cash || 50000000) - positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
      
      const portfolioStartDate = new Date(portfolio?.created_at || new Date());
      const daysSinceCreation = Math.floor((new Date() - portfolioStartDate) / (1000 * 60 * 60 * 24));
      const todayInterestEarned = baseCash * dailyInterestRate * Math.max(0, daysSinceCreation);
      const todayCashWithInterest = baseCash + todayInterestEarned;
      const todayTotalValue = todayPositionsValue + todayCashWithInterest;
      
      dataPoints.push({
        date: todayStr,
        totalValue: todayTotalValue,
        positionsValue: todayPositionsValue,
        cash: baseCash,
        cashWithInterest: todayCashWithInterest,
        interestEarned: todayInterestEarned
      });
    }

    return dataPoints;
  }, [portfolio, transactions, selectedPeriod, currentPrices, historicalPrices, positions, loading]);

  // Use stored historical values if available, otherwise use calculated values
  useEffect(() => {
    if (storedHistoricalValues && storedHistoricalValues.length > 0) {
      // Use pre-calculated values from database
      setHistoricalData(storedHistoricalValues);
    } else {
      // Fallback to calculated values
      setHistoricalData(calculatePortfolioHistory);
    }
  }, [storedHistoricalValues, calculatePortfolioHistory]);

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

  // Calculate current value to match Portfolio.js calculation
  // This ensures the chart's current value matches the portfolio summary
  const calculateCurrentValue = () => {
    // Calculate positions value using current prices
    const positionsValue = positions.reduce((total, position) => {
      const currentPrice = currentPrices[position.ticker];
      if (!currentPrice) return total;
      return total + (position.shares * currentPrice);
    }, 0);
    
    // Calculate cash with interest (matching Portfolio.js logic)
    const CASH_INTEREST_RATE = 0.042; // 4.2% annual
    const getPortfolioCash = () => {
      if (portfolio && typeof portfolio.current_cash === 'number' && !Number.isNaN(portfolio.current_cash)) {
        return portfolio.current_cash;
      }
      const startingCash = portfolio?.starting_cash || 50000000;
      const totalInvested = positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
      return startingCash - totalInvested;
    };
    
    const calculateInterestEarned = () => {
      const baseCash = getPortfolioCash();
      if (!portfolio || !portfolio.created_at) return 0;
      const daysSinceCreation = Math.floor(
        (new Date() - new Date(portfolio.created_at)) / (1000 * 60 * 60 * 24)
      );
      const dailyInterestRate = CASH_INTEREST_RATE / 365;
      return baseCash * dailyInterestRate * daysSinceCreation;
    };
    
    const cashWithInterest = getPortfolioCash() + calculateInterestEarned();
    return positionsValue + cashWithInterest;
  };
  
  const currentValue = calculateCurrentValue();
  const startValue = historicalData.length > 0 
    ? historicalData[0]?.totalValue || 0
    : 0;
  
  // Calculate total gain/loss (matching Portfolio.js calculateTotalGainLoss)
  // This is: current positions value - cost basis of positions
  const calculateTotalGainLoss = () => {
    if (!positions || positions.length === 0) return 0;
    return positions.reduce((total, position) => {
      const currentPrice = currentPrices[position.ticker];
      if (!currentPrice) return total;
      const currentValue = position.shares * currentPrice;
      const costBasis = position.shares * position.average_price;
      return total + (currentValue - costBasis);
    }, 0);
  };
  
  const totalGainLoss = calculateTotalGainLoss();
  const change = currentValue - startValue; // Period change
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
          <p className="text-sm text-gray-600">Total Gain/Loss</p>
          <p className={`text-xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(totalGainLoss)}
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
              strokeWidth={2}
              dot={false}
              name="Positions Value"
              activeDot={{ r: 4 }}
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

