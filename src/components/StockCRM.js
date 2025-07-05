import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, MessageSquare, Plus, ArrowLeft, Link, Target, FileText } from 'lucide-react';
import { stockServices } from '../stockServices';
import { analyticsServices } from '../supabaseServices';

const StockCRM = ({ ticker, onBack }) => {
  const [stockData, setStockData] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [connectedData, setConnectedData] = useState(null);

  useEffect(() => {
    if (ticker) {
      loadStockData();
    }
  }, [ticker]);

  const loadStockData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load stock quote
      const quoteResult = await stockServices.getStockQuote(ticker);
      if (quoteResult.success) {
        setStockData(quoteResult.data);
      } else {
        setError(quoteResult.error);
      }

      // Load company overview
      const overviewResult = await stockServices.getCompanyOverview(ticker);
      if (overviewResult.success) {
        setCompanyData(overviewResult.data);
      }

      // Load connected data from your existing systems
      const connectedResult = await analyticsServices.getConnectedData(ticker);
      setConnectedData(connectedResult);

    } catch (err) {
      setError('Failed to load stock data');
      console.error('Error loading stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercent = (value) => {
    if (!value) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button 
          onClick={loadStockData}
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with ticker and basic info */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Search</span>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ticker}</h1>
              {companyData && (
                <p className="text-gray-600">{companyData.name}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {stockData && (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">
                  {formatCurrency(stockData.price)}
                </span>
                <div className={`flex items-center space-x-1 ${
                  stockData.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockData.change >= 0 ? (
                    <TrendingUp size={16} />
                  ) : (
                    <TrendingDown size={16} />
                  )}
                  <span className="font-medium">
                    {formatCurrency(Math.abs(stockData.change))} ({stockData.changePercent})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline and Coverage Status */}
        <div className="flex space-x-4 mb-4">
          {/* Pipeline Status */}
          <div className="flex items-center space-x-2">
            <Target size={16} className="text-blue-600" />
            <span className="text-sm text-gray-600">Pipeline:</span>
            {connectedData?.pipeline ? (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                connectedData.pipeline.status === 'On Deck' ? 'bg-blue-100 text-blue-800' :
                connectedData.pipeline.status === 'Core' ? 'bg-green-100 text-green-800' :
                connectedData.pipeline.status === 'Passed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectedData.pipeline.status}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Not in pipeline</span>
            )}
          </div>

          {/* Coverage Status */}
          <div className="flex items-center space-x-2">
            <BarChart3 size={16} className="text-green-600" />
            <span className="text-sm text-gray-600">Coverage:</span>
            {connectedData?.coverage ? (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                connectedData.coverage.status === 'active' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {connectedData.coverage.status === 'active' ? 'Active' : 'Former'}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Not in coverage</span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        {stockData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Volume</div>
              <div className="font-semibold">{formatNumber(stockData.volume)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Open</div>
              <div className="font-semibold">{formatCurrency(stockData.open)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">High</div>
              <div className="font-semibold">{formatCurrency(stockData.high)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Low</div>
              <div className="font-semibold">{formatCurrency(stockData.low)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'fundamentals', label: 'Fundamentals', icon: DollarSign },
              { id: 'notes', label: 'Notes', icon: MessageSquare },
              { id: 'calendar', label: 'Calendar', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && companyData && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Company Description</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {companyData.description || 'No description available.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Company Info</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Exchange:</span> {companyData.exchange}</div>
                    <div><span className="text-gray-600">Sector:</span> {companyData.sector}</div>
                    <div><span className="text-gray-600">Industry:</span> {companyData.industry}</div>
                    <div><span className="text-gray-600">Country:</span> {companyData.country}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Key Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Market Cap:</span> {formatCurrency(companyData.marketCap)}</div>
                    <div><span className="text-gray-600">P/E Ratio:</span> {companyData.peRatio || 'N/A'}</div>
                    <div><span className="text-gray-600">Beta:</span> {companyData.beta || 'N/A'}</div>
                    <div><span className="text-gray-600">Dividend Yield:</span> {formatPercent(companyData.dividendYield)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fundamentals Tab */}
          {activeTab === 'fundamentals' && companyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Valuation</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">P/E Ratio:</span> {companyData.peRatio || 'N/A'}</div>
                    <div><span className="text-gray-600">P/B Ratio:</span> {companyData.priceToBook || 'N/A'}</div>
                    <div><span className="text-gray-600">EPS:</span> {formatCurrency(companyData.eps)}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Price Levels</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">52W High:</span> {formatCurrency(companyData.fiftyTwoWeekHigh)}</div>
                    <div><span className="text-gray-600">52W Low:</span> {formatCurrency(companyData.fiftyTwoWeekLow)}</div>
                    <div><span className="text-gray-600">50D MA:</span> {formatCurrency(companyData.fiftyDayAverage)}</div>
                    <div><span className="text-gray-600">200D MA:</span> {formatCurrency(companyData.twoHundredDayAverage)}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Returns</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Dividend Yield:</span> {formatPercent(companyData.dividendYield)}</div>
                    <div><span className="text-gray-600">Beta:</span> {companyData.beta || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Memos & Models Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <FileText size={20} className="text-purple-600" />
                    <span>Memos & Models</span>
                  </h3>
                  <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 flex items-center space-x-1">
                    <Plus size={14} />
                    <span>Create New</span>
                  </button>
                </div>
                
                {connectedData?.deliverables && connectedData.deliverables.length > 0 ? (
                  <div className="space-y-3">
                    {connectedData.deliverables.map((deliverable, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-3 py-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-sm">{deliverable.title}</h5>
                            <p className="text-xs text-gray-600">{deliverable.type} • {deliverable.priority} priority</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            deliverable.stage === 'completed' ? 'bg-green-100 text-green-800' :
                            deliverable.stage === 'sent' ? 'bg-blue-100 text-blue-800' :
                            deliverable.stage === 'in_draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {deliverable.stage}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(deliverable.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No memos or models for this stock</p>
                    <p className="text-xs text-gray-400 mt-1">Create your first memo or model to get started</p>
                  </div>
                )}
              </div>

              {/* Research Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <MessageSquare size={20} className="text-blue-600" />
                    <span>Research Notes</span>
                  </h3>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center space-x-1">
                    <Plus size={14} />
                    <span>Add Note</span>
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add your research notes, thoughts, or observations about this stock..."
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={4}
                  />
                  <div className="mt-2 flex justify-end">
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                      Save Note
                    </button>
                  </div>
                </div>
                
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No notes yet. Start adding your research notes above.</p>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="text-center text-gray-500 py-8">
              <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
              <p>Earnings calendar and events will appear here.</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockCRM; 