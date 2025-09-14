'use client'

import React, { useState, useEffect } from 'react';

interface AlertFiltersType {
  ticker?: string;
  action?: string;
  sentiment?: string;
  dateFrom?: string;
  dateTo?: string;
  strategyName?: string;
  page?: number;
  limit?: number;
}

interface AlertFiltersProps {
  filters: AlertFiltersType;
  onFilterChange: (filters: Partial<AlertFiltersType>) => void;
  loading: boolean;
}

export const AlertFilters: React.FC<AlertFiltersProps> = ({ filters, onFilterChange, loading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => { setLocalFilters(filters); }, [filters]);

  const applyFilters = () => { onFilterChange(localFilters); };

  const resetFilters = () => {
    const resetFilters = { ticker: 'all', action: 'all', sentiment: 'all', dateFrom: '', dateTo: '', strategyName: '', page: 1, limit: 50 };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = () => {
    return (
      (filters.ticker && filters.ticker !== 'all') ||
      (filters.action && filters.action !== 'all') ||
      (filters.sentiment && filters.sentiment !== 'all') ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.strategyName
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-medium">Filters</h3>
          {hasActiveFilters() && (<span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Active</span>)}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button onClick={resetFilters} disabled={loading} className="text-sm text-gray-400 hover:text-white transition-colors">Reset</button>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white transition-colors">
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ticker</label>
            <select value={localFilters.ticker || 'all'} onChange={(e) => setLocalFilters({ ...localFilters, ticker: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Tickers</option>
              <option value="TSLA">TSLA</option>
              <option value="AAPL">AAPL</option>
              <option value="MSFT">MSFT</option>
              <option value="GOOGL">GOOGL</option>
              <option value="AMZN">AMZN</option>
              <option value="NVDA">NVDA</option>
              <option value="SPY">SPY</option>
              <option value="QQQ">QQQ</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
            <select value={localFilters.action || 'all'} onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Actions</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="exit">Exit</option>
              <option value="close">Close</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sentiment</label>
            <select value={localFilters.sentiment || 'all'} onChange={(e) => setLocalFilters({ ...localFilters, sentiment: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Sentiments</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="flat">Flat</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => { const newFilters = { ...localFilters, dateFrom: today, dateTo: today }; setLocalFilters(newFilters); onFilterChange(newFilters); }} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">Today</button>
          <button onClick={() => { const newFilters = { ...localFilters, dateFrom: weekAgo, dateTo: today }; setLocalFilters(newFilters); onFilterChange(newFilters); }} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">Last 7 Days</button>
          <button onClick={() => { const newFilters = { ...localFilters, dateFrom: '', dateTo: '' }; setLocalFilters(newFilters); onFilterChange(newFilters); }} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">All Time</button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">From Date</label>
                <input type="date" value={localFilters.dateFrom || ''} onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">To Date</label>
                <input type="date" value={localFilters.dateTo || ''} onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Strategy Name</label>
              <input type="text" placeholder="Enter strategy name..." value={localFilters.strategyName || ''} onChange={(e) => setLocalFilters({ ...localFilters, strategyName: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Results Per Page</label>
              <select value={localFilters.limit || 50} onChange={(e) => setLocalFilters({ ...localFilters, limit: parseInt(e.target.value) })} className="w-full sm:w-auto bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-4 flex gap-2">
        <button onClick={applyFilters} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors">{loading ? 'Loading...' : 'Apply Filters'}</button>
        {hasActiveFilters() && (<button onClick={resetFilters} disabled={loading} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors">Reset All</button>)}
      </div>
    </div>
  );
};


