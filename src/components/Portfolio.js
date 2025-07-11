import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Plus, Minus, BarChart3 } from 'lucide-react';
import { portfolioServices } from '../supabaseServices';
import { stockServices } from '../stockServices';

const Portfolio = ({ portfolio, positions, transactions, onRefresh }) => {
  const [currentPrices, setCurrentPrices] = useState({});
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [buyForm, setBuyForm] = useState({ ticker: '', shares: '', notes: '' });
  const [sellForm, setSellForm] = useState({ shares: '', notes: '' });
  const [loading, setLoading] = useState(false);

  // Load current prices for all positions
  useEffect(() => {
    const loadPrices = async () => {
      const pricePromises = positions.map(async (position) => {
        try {
          const price = await stockServices.getStockPrice(position.ticker);
          return { ticker: position.ticker, price };
        } catch (error) {
          console.error(`Error loading price for ${position.ticker}:`, error);
          return { ticker: position.ticker, price: null };
        }
      });

      const prices = await Promise.all(pricePromises);
      const priceMap = {};
      prices.forEach(({ ticker, price }) => {
        priceMap[ticker] = price;
      });
      setCurrentPrices(priceMap);
    };

    if (positions.length > 0) {
      loadPrices();
    }
  }, [positions]);

  const handleBuy = async () => {
    if (!buyForm.ticker || !buyForm.shares) return;

    setLoading(true);
    try {
      const price = await stockServices.getStockPrice(buyForm.ticker);
      if (!price) {
        alert('Could not get current price for this stock. Please try again.');
        return;
      }

      const totalCost = parseFloat(buyForm.shares) * price;
      if (totalCost > (portfolio?.current_cash || 0)) {
        alert(`Insufficient cash. You need ${formatCurrency(totalCost)} but only have ${formatCurrency(portfolio?.current_cash || 0)} available.`);
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
        setShowBuyModal(false);
        onRefresh();
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
      const price = await stockServices.getStockPrice(selectedPosition.ticker);
      if (!price) {
        alert('Could not get current price for this stock. Please try again.');
        return;
      }

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

  const calculateTotalValue = () => {
    const positionsValue = positions.reduce((total, position) => {
      const value = calculatePositionValue(position);
      return total + (value || 0);
    }, 0);
    return positionsValue + (portfolio?.current_cash || 0);
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
    const startingValue = portfolio?.starting_cash || 50000000;
    return ((totalValue - startingValue) / startingValue) * 100;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Portfolio Summary</h2>
          <button
            onClick={() => setShowBuyModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Buy Stock
          </button>
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
                <p className="text-lg font-semibold">{formatCurrency(portfolio?.current_cash || 0)}</p>
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

      {/* Positions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Current Positions</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No positions yet. Start by buying some stocks!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => {
              const currentPrice = currentPrices[position.ticker];
              const positionValue = calculatePositionValue(position);
              const gainLoss = calculatePositionGainLoss(position);
              const gainLossPercent = gainLoss && positionValue ? (gainLoss / (positionValue - gainLoss)) * 100 : null;

              return (
                <div key={position.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{position.ticker}</h4>
                        <span className="text-sm text-gray-600">
                          {position.shares} shares @ {formatCurrency(position.average_price)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Current Price</p>
                          <p className="font-medium">
                            {currentPrice ? formatCurrency(currentPrice) : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Position Value</p>
                          <p className="font-medium">
                            {positionValue ? formatCurrency(positionValue) : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Gain/Loss</p>
                          <p className={`font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss ? formatCurrency(gainLoss) : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Gain/Loss %</p>
                          <p className={`font-medium ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLossPercent ? formatPercentage(gainLossPercent) : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPosition(position);
                          setSellForm({ shares: '', notes: '' });
                          setShowSellModal(true);
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 flex items-center"
                      >
                        <Minus size={14} className="mr-1" />
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  Available Cash: <span className="font-semibold">{formatCurrency(portfolio?.current_cash || 0)}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                <input
                  type="text"
                  value={buyForm.ticker}
                  onChange={(e) => setBuyForm({ ...buyForm, ticker: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., AAPL"
                />
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
                onClick={() => setShowBuyModal(false)}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                disabled={loading || !buyForm.ticker || !buyForm.shares}
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