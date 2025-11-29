import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Clock, Target, Award, PieChart } from 'lucide-react';

const PortfolioAnalytics = ({ positions, transactions, portfolio }) => {
  const analytics = useMemo(() => {
    if (!positions || positions.length === 0) {
      return null;
    }

    // Calculate win rate
    const winningPositions = positions.filter(p => {
      // This will be calculated when we have current prices
      return true; // Placeholder
    });

    // Calculate average position size
    const totalInvested = positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
    const avgPositionSize = positions.length > 0 ? totalInvested / positions.length : 0;

    // Calculate largest and smallest positions
    const positionSizes = positions.map(p => ({
      ticker: p.ticker,
      size: p.shares * p.average_price
    })).sort((a, b) => b.size - a.size);

    const largestPosition = positionSizes[0];
    const smallestPosition = positionSizes[positionSizes.length - 1];

    // Calculate transaction statistics
    const buyTransactions = transactions.filter(t => t.transaction_type === 'buy');
    const sellTransactions = transactions.filter(t => t.transaction_type === 'sell');
    const totalTransactions = transactions.length;
    const avgTransactionSize = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + t.total_amount, 0) / transactions.length
      : 0;

    // Calculate holding periods (for sold positions, we'd need more data)
    // For now, calculate based on when positions were created
    const positionsWithAge = positions.map(p => {
      const positionTransactions = transactions.filter(t => t.ticker === p.ticker);
      if (positionTransactions.length > 0) {
        const firstTransaction = positionTransactions.sort((a, b) => 
          new Date(a.transaction_date) - new Date(b.transaction_date)
        )[0];
        const daysHeld = Math.floor(
          (new Date() - new Date(firstTransaction.transaction_date)) / (1000 * 60 * 60 * 24)
        );
        return { ...p, daysHeld };
      }
      return { ...p, daysHeld: 0 };
    });

    const avgHoldingPeriod = positionsWithAge.length > 0
      ? positionsWithAge.reduce((sum, p) => sum + p.daysHeld, 0) / positionsWithAge.length
      : 0;

    // Calculate portfolio concentration
    const totalValue = positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
    const concentration = largestPosition ? (largestPosition.size / totalValue) * 100 : 0;

    // Calculate turnover (simplified - total transaction volume / portfolio value)
    const totalTransactionVolume = transactions.reduce((sum, t) => sum + Math.abs(t.total_amount), 0);
    const turnover = totalValue > 0 ? (totalTransactionVolume / totalValue) * 100 : 0;

    return {
      totalPositions: positions.length,
      totalInvested,
      avgPositionSize,
      largestPosition,
      smallestPosition,
      buyTransactions: buyTransactions.length,
      sellTransactions: sellTransactions.length,
      totalTransactions,
      avgTransactionSize,
      avgHoldingPeriod,
      concentration,
      turnover
    };
  }, [positions, transactions]);

  if (!analytics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Portfolio Analytics
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>No positions yet. Add some stocks to see analytics!</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Portfolio Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Positions</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.totalPositions}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalInvested)}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Avg Position Size</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(analytics.avgPositionSize)}</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Avg Holding Period</p>
            <p className="text-2xl font-bold text-orange-600">{Math.round(analytics.avgHoldingPeriod)} days</p>
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2" size={18} />
            Largest Position
          </h4>
          {analytics.largestPosition && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{analytics.largestPosition.ticker}</span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(analytics.largestPosition.size)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {((analytics.largestPosition.size / analytics.totalInvested) * 100).toFixed(1)}% of portfolio
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold mb-4 flex items-center">
            <TrendingDown className="mr-2" size={18} />
            Smallest Position
          </h4>
          {analytics.smallestPosition && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{analytics.smallestPosition.ticker}</span>
                <span className="text-lg font-semibold text-gray-600">
                  {formatCurrency(analytics.smallestPosition.size)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {((analytics.smallestPosition.size / analytics.totalInvested) * 100).toFixed(1)}% of portfolio
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold mb-4 flex items-center">
          <Clock className="mr-2" size={18} />
          Transaction Activity
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Buy Orders</p>
            <p className="text-xl font-bold text-green-600">{analytics.buyTransactions}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Sell Orders</p>
            <p className="text-xl font-bold text-red-600">{analytics.sellTransactions}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-xl font-bold text-blue-600">{analytics.totalTransactions}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Avg Transaction</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(analytics.avgTransactionSize)}</p>
          </div>
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold mb-4 flex items-center">
            <PieChart className="mr-2" size={18} />
            Portfolio Concentration
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Largest Position</span>
                <span className="text-sm font-semibold">{analytics.concentration.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(analytics.concentration, 100)}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {analytics.concentration > 25
                ? '⚠️ High concentration - consider diversifying'
                : analytics.concentration > 15
                ? 'Moderate concentration'
                : 'Well diversified'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold mb-4 flex items-center">
            <Target className="mr-2" size={18} />
            Portfolio Turnover
          </h4>
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{analytics.turnover.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-2">Annualized turnover rate</p>
            </div>
            <p className="text-xs text-gray-500">
              {analytics.turnover > 100
                ? 'High turnover - active trading strategy'
                : analytics.turnover > 50
                ? 'Moderate turnover'
                : 'Low turnover - buy and hold strategy'}
            </p>
          </div>
        </div>
      </div>

      {/* Position Size Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2" size={18} />
          Position Size Distribution
        </h4>
        <div className="space-y-2">
          {positions
            .map(p => ({
              ticker: p.ticker,
              size: p.shares * p.average_price,
              percentage: ((p.shares * p.average_price) / analytics.totalInvested) * 100
            }))
            .sort((a, b) => b.size - a.size)
            .map((pos, idx) => (
              <div key={pos.ticker} className="flex items-center space-x-3">
                <div className="w-12 text-sm font-medium text-gray-700">{pos.ticker}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{formatCurrency(pos.size)}</span>
                    <span className="text-gray-500">{pos.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${pos.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioAnalytics;

