import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Plus, BarChart3 } from 'lucide-react';
import { portfolioServices } from '../supabaseServices';
import { stockServices } from '../stockServices';
import PortfolioAnalytics from './PortfolioAnalytics';
import PortfolioValueChart from './PortfolioValueChart';

const Portfolio = ({ portfolio, positions, transactions, onRefresh }) => {
  const [currentPrices, setCurrentPrices] = useState({});
  const [priceChanges, setPriceChanges] = useState({});
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [buyForm, setBuyForm] = useState({ ticker: '', shares: '', notes: '' });
  const [sellForm, setSellForm] = useState({ shares: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Load current prices for all positions
  useEffect(() => {
    const loadPrices = async () => {
      if (positions.length === 0) return;
      
      setPricesLoading(true);
      try {
        const pricePromises = positions.map(async (position) => {
          try {
            const priceData = await stockServices.getStockPrice(position.ticker);
            
            // If no price data, use the average price as fallback
            const fallbackPrice = priceData?.price || position.average_price;
            const fallbackChange = priceData?.change || 0;
            const fallbackChangePercent = priceData?.changePercent || 0;
            
            return { 
              ticker: position.ticker, 
              price: fallbackPrice,
              change: fallbackChange,
              changePercent: fallbackChangePercent
            };
          } catch (error) {
            console.error(`Error loading price for ${position.ticker}:`, error);
            // Use average price as fallback
            return { 
              ticker: position.ticker, 
              price: position.average_price, 
              change: 0, 
              changePercent: 0 
            };
          }
        });

        const prices = await Promise.all(pricePromises);
        const priceMap = {};
        const changeMap = {};
        prices.forEach(({ ticker, price, change, changePercent }) => {
          priceMap[ticker] = price;
          changeMap[ticker] = { change, changePercent };
        });
        setCurrentPrices(priceMap);
        setPriceChanges(changeMap);
      } finally {
        setPricesLoading(false);
      }
    };

    loadPrices();
  }, [positions]);

  const handleBuy = async () => {
    if (!buyForm.ticker || !buyForm.shares) {
      return;
    }

    setLoading(true);
    try {
      const priceData = await stockServices.getStockPrice(buyForm.ticker);
      
      if (!priceData || !priceData.price) {
        alert('Could not get current price for this stock. Please try again.');
        return;
      }

      const price = priceData.price;
      const totalCost = parseFloat(buyForm.shares) * price;
      const availableCash = calculateAvailableCash();
      
      if (totalCost > availableCash) {
        alert(`Insufficient cash. You need ${formatCurrency(totalCost)} but only have ${formatCurrency(availableCash)} available.`);
        return;
      }

      const result = await portfolioServices.buyShares(
        portfolio.id,
        buyForm.ticker.toUpperCase(),
        parseFloat(buyForm.shares),
        price,
        buyForm.notes
      );

      if (result.success) {
        setBuyForm({ ticker: '', shares: '', notes: '' });
        setCurrentPrice(null);
        setShowBuyModal(false);
        await onRefresh();
      } else {
        alert('Error buying shares: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!sellForm.shares || !selectedPosition) return;

    setLoading(true);
    try {
      const priceData = await stockServices.getStockPrice(selectedPosition.ticker);
      if (!priceData || !priceData.price) {
        alert('Could not get current price for this stock. Please try again.');
        return;
      }

      const price = priceData.price;
      const result = await portfolioServices.sellShares(
        portfolio.id,
        selectedPosition.ticker,
        parseFloat(sellForm.shares),
        price,
        sellForm.notes
      );

      if (result.success) {
        setSellForm({ shares: '', notes: '' });
        setSelectedPosition(null);
        setShowSellModal(false);
        onRefresh();
      } else {
        alert('Error selling shares: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePositionValue = (position) => {
    const currentPrice = currentPrices[position.ticker];
    if (!currentPrice) return null;
    return position.shares * currentPrice;
  };

  const calculatePositionGainLoss = (position) => {
    const currentValue = calculatePositionValue(position);
    if (!currentValue) return null;
    const costBasis = position.shares * position.average_price;
    return currentValue - costBasis;
  };

  const calculateTotalInvested = () => {
    return positions.reduce((total, position) => {
      return total + (position.shares * position.average_price);
    }, 0);
  };

  // Fed interest rate for cash (80% of Fed Funds Rate)
  const CASH_INTEREST_RATE = 0.042; // 4.2% annual

  const getPortfolioCash = () => {
    if (portfolio && typeof portfolio.current_cash === 'number' && !Number.isNaN(portfolio.current_cash)) {
      return portfolio.current_cash;
    }

    const startingCash = portfolio?.starting_cash || 50000000;
    const fallbackCash = startingCash - calculateTotalInvested();
    return fallbackCash;
  };

  // Calculate interest earned on cash
  const calculateInterestEarned = () => {
    const baseCash = getPortfolioCash();
    if (!portfolio || !portfolio.created_at) return 0;

    // Calculate days since portfolio creation
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(portfolio.created_at)) / (1000 * 60 * 60 * 24)
    );
    
    // Daily interest rate
    const dailyInterestRate = CASH_INTEREST_RATE / 365;
    
    // Calculate interest earned (simple interest for now)
    return baseCash * dailyInterestRate * daysSinceCreation;
  };

  // Calculate cash with interest earned
  const getCashWithInterest = () => {
    const baseCash = getPortfolioCash();
    return baseCash + calculateInterestEarned();
  };

  const calculateTotalValue = () => {
    const positionsValue = positions.reduce((total, position) => {
      const value = calculatePositionValue(position);
      return total + (value || 0);
    }, 0);
    const cashWithInterest = getCashWithInterest();

    // Total value = Current market value of positions + Available cash + interest earned
    return positionsValue + (typeof cashWithInterest === 'number' && !Number.isNaN(cashWithInterest) ? cashWithInterest : 0);
  };

  const calculateTotalGainLoss = () => {
    const positionsGainLoss = positions.reduce((total, position) => {
      const gainLoss = calculatePositionGainLoss(position);
      return total + (gainLoss || 0);
    }, 0);
    return positionsGainLoss;
  };

  const calculateTotalReturn = () => {
    const totalValue = calculateTotalValue();
    if (totalValue === null || totalValue === undefined) {
      return null;
    }
    const startingValue = portfolio?.starting_cash || 50000000;
    return ((totalValue - startingValue) / startingValue) * 100;
  };

  // Calculate available cash using portfolio cash balance with interest
  const calculateAvailableCash = () => {
    return getCashWithInterest();
  };

  // Sorting function
  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (key) {
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'lastPrice':
          aValue = currentPrices[a.ticker] || 0;
          bValue = currentPrices[b.ticker] || 0;
          break;
        case 'priceChange':
          aValue = priceChanges[a.ticker]?.change || 0;
          bValue = priceChanges[b.ticker]?.change || 0;
          break;
        case 'todayGainLoss':
          aValue = calculatePositionGainLoss(a) || 0;
          bValue = calculatePositionGainLoss(b) || 0;
          break;
        case 'totalGainLoss':
          aValue = calculatePositionGainLoss(a) || 0;
          bValue = calculatePositionGainLoss(b) || 0;
          break;
        case 'currentValue':
          aValue = calculatePositionValue(a) || 0;
          bValue = calculatePositionValue(b) || 0;
          break;
        case 'accountPercentage':
          const totalValue = calculateTotalValue();
          aValue = totalValue > 0 ? (calculatePositionValue(a) || 0) / totalValue : 0;
          bValue = totalValue > 0 ? (calculatePositionValue(b) || 0) / totalValue : 0;
          break;
        case 'quantity':
          aValue = a.shares;
          bValue = b.shares;
          break;
        case 'averageCost':
          aValue = a.average_price;
          bValue = b.average_price;
          break;
        case 'costBasis':
          aValue = a.shares * a.average_price;
          bValue = b.shares * b.average_price;
          break;
        default:
          return 0;
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Loading...';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Fetch current price for a ticker
  const fetchCurrentPrice = async (ticker) => {
    if (!ticker || ticker.length < 1) {
      setCurrentPrice(null);
      return;
    }

    setPriceLoading(true);
    try {
      const priceData = await stockServices.getStockPrice(ticker.toUpperCase());
      setCurrentPrice(priceData?.price || null);
    } catch (error) {
      console.error('Error fetching price:', error);
      setCurrentPrice(null);
    } finally {
      setPriceLoading(false);
    }
  };

  // Calculate total cost and portfolio percentage
  const calculatePurchaseDetails = () => {
    if (!currentPrice || !buyForm.shares || !portfolio) return null;
    
    const shares = parseFloat(buyForm.shares);
    const totalCost = shares * currentPrice;
    const portfolioValue = calculateTotalValue();
    const percentage = (totalCost / portfolioValue) * 100;
    const availableCash = calculateAvailableCash();
    
    return {
      totalCost,
      percentage,
      shares,
      price: currentPrice,
      availableCash
    };
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Portfolio Summary</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBuyModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Buy Stock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="text-blue-600 mr-2" size={20} />
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-lg font-semibold">{formatCurrency(calculateTotalValue())}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="text-green-600 mr-2" size={20} />
              <div>
                <p className="text-sm text-gray-600">Total Gain/Loss</p>
                <p className={`text-lg font-semibold ${calculateTotalGainLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calculateTotalGainLoss())}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="text-yellow-600 mr-2" size={20} />
              <div>
                <p className="text-sm text-gray-600">Available Cash</p>
                <p className="text-lg font-semibold">{formatCurrency(calculateAvailableCash())}</p>
                <p className="text-xs text-gray-500 mt-1">
                  +{formatCurrency(calculateInterestEarned())} interest
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="text-purple-600 mr-2" size={20} />
              <div>
                <p className="text-sm text-gray-600">Positions</p>
                <p className="text-lg font-semibold">{positions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">Starting Value</p>
              <p className="font-semibold">{formatCurrency(portfolio?.starting_cash || 50000000)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Total Return</p>
              <p className={`font-semibold ${calculateTotalReturn() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(calculateTotalReturn())}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Portfolio Return</p>
              <p className={`font-semibold ${calculateTotalGainLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calculateTotalGainLoss())}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Positions Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Positions</h3>
          {pricesLoading && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Refreshing prices...
            </div>
          )}
        </div>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No positions yet. Start by buying some stocks!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('ticker')}>
                    Ticker {getSortIcon('ticker')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('lastPrice')}>
                    Last Price {getSortIcon('lastPrice')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('priceChange')}>
                    Price Change {getSortIcon('priceChange')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('todayGainLoss')}>
                    % Today's G/L {getSortIcon('todayGainLoss')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('totalGainLoss')}>
                    $ Total G/L {getSortIcon('totalGainLoss')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('totalGainLoss')}>
                    % Total G/L {getSortIcon('totalGainLoss')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('currentValue')}>
                    Current Value {getSortIcon('currentValue')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('accountPercentage')}>
                    % of Account {getSortIcon('accountPercentage')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('quantity')}>
                    Quantity {getSortIcon('quantity')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('averageCost')}>
                    Avg Cost {getSortIcon('averageCost')}
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('costBasis')}>
                    Cost Basis {getSortIcon('costBasis')}
                  </th>
                  <th className="text-right py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortData(positions, sortConfig.key, sortConfig.direction).map((position) => {
                  const currentPrice = currentPrices[position.ticker];
                  const positionValue = calculatePositionValue(position);
                  const gainLoss = calculatePositionGainLoss(position);
                  const costBasis = position.shares * position.average_price;
                  const gainLossPercent = gainLoss !== null && costBasis > 0 ? (gainLoss / costBasis) * 100 : null;
                  const totalValue = calculateTotalValue();
                  const accountPercentage = totalValue > 0 ? (positionValue || 0) / totalValue * 100 : 0;
                  const priceChange = priceChanges[position.ticker];
                  const todayGainLossPercent = priceChange?.changePercent || 0;

                  return (
                    <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{position.ticker}</td>
                      <td className="py-3 px-2 text-right">
                        {currentPrice !== null ? formatCurrency(currentPrice) : (
                          <span className="text-gray-500">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {priceChange?.change ? (
                          <span className={priceChange.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {priceChange.change >= 0 ? '+' : ''}{formatCurrency(priceChange.change)}
                          </span>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {todayGainLossPercent ? (
                          <span className={todayGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {todayGainLossPercent >= 0 ? '+' : ''}{todayGainLossPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {gainLoss !== null ? (
                          <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                          </span>
                        ) : (
                          <span className="text-gray-500">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {gainLossPercent !== null ? (
                          <span className={gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {positionValue !== null ? formatCurrency(positionValue) : (
                          <span className="text-gray-500">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {accountPercentage.toFixed(2)}%
                      </td>
                      <td className="py-3 px-2 text-right">
                        {position.shares.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatCurrency(position.average_price)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatCurrency(position.shares * position.average_price)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => {
                            setSelectedPosition(position);
                            setSellForm({ shares: '', notes: '' });
                            setShowSellModal(true);
                          }}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portfolio Value Chart */}
      <PortfolioValueChart
        portfolio={portfolio}
        positions={positions}
        transactions={transactions}
        currentPrices={currentPrices}
      />

      {/* Portfolio Analytics */}
      <PortfolioAnalytics 
        positions={positions}
        transactions={transactions}
        portfolio={portfolio}
      />

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    transaction.transaction_type === 'buy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.transaction_type.toUpperCase()}
                  </span>
                  <span className="font-medium">{transaction.ticker}</span>
                  <span className="text-gray-600">
                    {transaction.shares} shares @ {formatCurrency(transaction.price_per_share)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(transaction.total_amount)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Buy Stock</h3>
            
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  Available Cash: <span className="font-semibold">{formatCurrency(calculateAvailableCash())}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={buyForm.ticker}
                    onChange={(e) => {
                      setBuyForm({ ...buyForm, ticker: e.target.value });
                      fetchCurrentPrice(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., AAPL"
                  />
                  {priceLoading && (
                    <div className="flex items-center px-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                {currentPrice && (
                  <p className="text-sm text-green-600 mt-1">
                    Current Price: {formatCurrency(currentPrice)}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shares</label>
                <input
                  type="number"
                  value={buyForm.shares}
                  onChange={(e) => setBuyForm({ ...buyForm, shares: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Number of shares"
                  step="0.01"
                  min="0.01"
                />
              </div>

              {/* Purchase Details */}
              {calculatePurchaseDetails() && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Purchase Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Cost:</span>
                      <span className="font-semibold">{formatCurrency(calculatePurchaseDetails().totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Portfolio %:</span>
                      <span className="font-semibold">{calculatePurchaseDetails().percentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Remaining Cash:</span>
                      <span className={`font-semibold ${calculatePurchaseDetails().availableCash - calculatePurchaseDetails().totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(calculatePurchaseDetails().availableCash - calculatePurchaseDetails().totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={buyForm.notes}
                  onChange={(e) => setBuyForm({ ...buyForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Why are you buying this stock?"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setCurrentPrice(null);
                  setBuyForm({ ticker: '', shares: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                disabled={loading || !buyForm.ticker || !buyForm.shares || 
                  (calculatePurchaseDetails() && calculatePurchaseDetails().totalCost > calculatePurchaseDetails().availableCash)}
              >
                {loading ? 'Buying...' : 'Buy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Sell {selectedPosition.ticker}</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">Available shares: {selectedPosition.shares}</p>
              <p className="text-sm text-gray-600">Average price: {formatCurrency(selectedPosition.average_price)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shares to Sell</label>
                <input
                  type="number"
                  value={sellForm.shares}
                  onChange={(e) => setSellForm({ ...sellForm, shares: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Number of shares"
                  step="0.01"
                  min="0.01"
                  max={selectedPosition.shares}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={sellForm.notes}
                  onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Why are you selling this stock?"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSellModal(false)}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                disabled={loading || !sellForm.shares || parseFloat(sellForm.shares) > selectedPosition.shares}
              >
                {loading ? 'Selling...' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio; 