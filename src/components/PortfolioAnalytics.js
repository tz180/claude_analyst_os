import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, Clock, Target, PieChart, Globe, Building2, Factory } from 'lucide-react';
import { stockServices } from '../stockServices';

const PortfolioAnalytics = ({ positions, transactions, portfolio }) => {
  const [companyData, setCompanyData] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch company overview data for all positions
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!positions || positions.length === 0) return;

      setLoading(true);
      const data = {};
      const tickers = positions.map(p => p.ticker);

      // Fetch data for all tickers in parallel (paid Alpha Vantage has higher rate limits)
      const fetchPromises = tickers.map(async (ticker) => {
        try {
          const result = await stockServices.getCompanyOverview(ticker);
          if (result.success && result.data) {
            return {
              ticker,
              data: {
                sector: result.data.sector || 'Unknown',
                industry: result.data.industry || 'Unknown',
                country: result.data.country || 'Unknown',
                name: result.data.name || ticker
              }
            };
          }
        } catch (error) {
          console.error(`Error fetching data for ${ticker}:`, error);
        }
        return {
          ticker,
          data: {
            sector: 'Unknown',
            industry: 'Unknown',
            country: 'Unknown',
            name: ticker
          }
        };
      });

      // Wait for all requests to complete
      const results = await Promise.all(fetchPromises);
      results.forEach(({ ticker, data: tickerData }) => {
        data[ticker] = tickerData;
      });

      setCompanyData(data);
      setLoading(false);
    };

    fetchCompanyData();
  }, [positions]);

  const analytics = useMemo(() => {
    if (!positions || positions.length === 0) {
      return null;
    }

    // Calculate average position size
    const totalInvested = positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
    const avgPositionSize = positions.length > 0 ? totalInvested / positions.length : 0;

    // Calculate transaction statistics
    const buyTransactions = transactions.filter(t => t.transaction_type === 'buy');
    const sellTransactions = transactions.filter(t => t.transaction_type === 'sell');
    const totalTransactions = transactions.length;
    const avgTransactionSize = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + t.total_amount, 0) / transactions.length
      : 0;

    // Calculate holding periods
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

    // Calculate turnover
    const totalValue = positions.reduce((sum, p) => sum + (p.shares * p.average_price), 0);
    const totalTransactionVolume = transactions.reduce((sum, t) => sum + Math.abs(t.total_amount), 0);
    const turnover = totalValue > 0 ? (totalTransactionVolume / totalValue) * 100 : 0;

    // Group by sector
    const sectorGroups = {};
    positions.forEach(p => {
      const positionValue = p.shares * p.average_price;
      const sector = companyData[p.ticker]?.sector || 'Unknown';
      if (!sectorGroups[sector]) {
        sectorGroups[sector] = { value: 0, count: 0, tickers: [] };
      }
      sectorGroups[sector].value += positionValue;
      sectorGroups[sector].count += 1;
      sectorGroups[sector].tickers.push(p.ticker);
    });

    // Group by industry
    const industryGroups = {};
    positions.forEach(p => {
      const positionValue = p.shares * p.average_price;
      const industry = companyData[p.ticker]?.industry || 'Unknown';
      if (!industryGroups[industry]) {
        industryGroups[industry] = { value: 0, count: 0, tickers: [] };
      }
      industryGroups[industry].value += positionValue;
      industryGroups[industry].count += 1;
      industryGroups[industry].tickers.push(p.ticker);
    });

    // Group by country
    const countryGroups = {};
    positions.forEach(p => {
      const positionValue = p.shares * p.average_price;
      const country = companyData[p.ticker]?.country || 'Unknown';
      if (!countryGroups[country]) {
        countryGroups[country] = { value: 0, count: 0, tickers: [] };
      }
      countryGroups[country].value += positionValue;
      countryGroups[country].count += 1;
      countryGroups[country].tickers.push(p.ticker);
    });

    return {
      totalInvested,
      avgPositionSize,
      buyTransactions: buyTransactions.length,
      sellTransactions: sellTransactions.length,
      totalTransactions,
      avgTransactionSize,
      avgHoldingPeriod,
      turnover,
      sectorGroups,
      industryGroups,
      countryGroups
    };
  }, [positions, transactions, companyData]);

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

  const formatPercentage = (value, total) => {
    return ((value / total) * 100).toFixed(1);
  };

  // Sort groups by value (descending)
  const sortedSectors = Object.entries(analytics.sectorGroups)
    .sort((a, b) => b[1].value - a[1].value);
  const sortedIndustries = Object.entries(analytics.industryGroups)
    .sort((a, b) => b[1].value - a[1].value);
  const sortedCountries = Object.entries(analytics.countryGroups)
    .sort((a, b) => b[1].value - a[1].value);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Portfolio Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Portfolio Turnover</p>
            <p className="text-2xl font-bold text-indigo-600">{analytics.turnover.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Sector Allocation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold mb-4 flex items-center">
          <Building2 className="mr-2" size={18} />
          Sector Allocation
        </h4>
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            <p>Loading sector data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSectors.map(([sector, data]) => (
              <div key={sector}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{sector}</span>
                    <span className="text-xs text-gray-500">({data.count} {data.count === 1 ? 'position' : 'positions'})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatCurrency(data.value)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatPercentage(data.value, analytics.totalInvested)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${formatPercentage(data.value, analytics.totalInvested)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.tickers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Industry Allocation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold mb-4 flex items-center">
          <Factory className="mr-2" size={18} />
          Industry Allocation
        </h4>
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            <p>Loading industry data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedIndustries.slice(0, 10).map(([industry, data]) => (
              <div key={industry}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{industry}</span>
                    <span className="text-xs text-gray-500">({data.count} {data.count === 1 ? 'position' : 'positions'})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatCurrency(data.value)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatPercentage(data.value, analytics.totalInvested)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${formatPercentage(data.value, analytics.totalInvested)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.tickers.join(', ')}
                </div>
              </div>
            ))}
            {sortedIndustries.length > 10 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing top 10 industries (out of {sortedIndustries.length} total)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Geographic Allocation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold mb-4 flex items-center">
          <Globe className="mr-2" size={18} />
          Geographic Allocation
        </h4>
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            <p>Loading country data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCountries.map(([country, data]) => (
              <div key={country}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{country}</span>
                    <span className="text-xs text-gray-500">({data.count} {data.count === 1 ? 'position' : 'positions'})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatCurrency(data.value)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatPercentage(data.value, analytics.totalInvested)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${formatPercentage(data.value, analytics.totalInvested)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.tickers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Activity */}
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
    </div>
  );
};

export default PortfolioAnalytics;
