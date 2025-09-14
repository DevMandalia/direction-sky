'use client'

// AlertStats.tsx - Alert statistics component

import React from 'react';

interface AlertStats {
  totalAlerts: number;
  todayAlerts: number;
  weekAlerts: number;
  monthAlerts: number;
  uniqueTickers: number;
  topTickers: Array<{ ticker: string; count: number }>;
  actionBreakdown: Array<{ action: string; count: number }>;
  sentimentBreakdown: Array<{ sentiment: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

interface AlertStatsProps {
  stats: AlertStats | null;
  loading: boolean;
}

export const AlertStats: React.FC<AlertStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
            <div className="w-16 h-4 bg-gray-700 rounded mb-2"></div>
            <div className="w-12 h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'buy':
        return 'text-green-400';
      case 'sell':
        return 'text-red-400';
      case 'exit':
      case 'close':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'bullish':
        return 'text-green-400';
      case 'bearish':
        return 'text-red-400';
      case 'flat':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Alerts</div>
          <div className="text-white text-2xl font-bold">{stats.totalAlerts.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Today</div>
          <div className="text-white text-2xl font-bold">{stats.todayAlerts.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">This Week</div>
          <div className="text-white text-2xl font-bold">{stats.weekAlerts.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Unique Tickers</div>
          <div className="text-white text-2xl font-bold">{stats.uniqueTickers.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-3">Top Tickers (7 days)</h4>
          {stats.topTickers.length > 0 ? (
            <div className="space-y-2">
              {stats.topTickers.slice(0, 5).map((ticker, index) => (
                <div key={ticker.ticker} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                    <span className="text-white font-medium">{ticker.ticker}</span>
                  </div>
                  <span className="text-gray-300 text-sm">{ticker.count}</span>
                </div>
              ))}
            </div>
          ) : (<div className="text-gray-400 text-sm">No data available</div>)}
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-3">Actions (7 days)</h4>
          {stats.actionBreakdown.length > 0 ? (
            <div className="space-y-2">
              {stats.actionBreakdown.map((action) => (
                <div key={action.action} className="flex items-center justify-between">
                  <span className={`font-medium capitalize ${getActionColor(action.action)}`}>{action.action}</span>
                  <span className="text-gray-300 text-sm">{action.count}</span>
                </div>
              ))}
            </div>
          ) : (<div className="text-gray-400 text-sm">No data available</div>)}
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-3">Sentiment (7 days)</h4>
          {stats.sentimentBreakdown.length > 0 ? (
            <div className="space-y-2">
              {stats.sentimentBreakdown.map((sentiment) => (
                <div key={sentiment.sentiment} className="flex items-center justify-between">
                  <span className={`font-medium capitalize ${getSentimentColor(sentiment.sentiment)}`}>{sentiment.sentiment}</span>
                  <span className="text-gray-300 text-sm">{sentiment.count}</span>
                </div>
              ))}
            </div>
          ) : (<div className="text-gray-400 text-sm">No data available</div>)}
        </div>
      </div>

      {stats.hourlyDistribution.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-3">Today's Alert Distribution</h4>
          <div className="flex items-end gap-1 h-24">
            {Array.from({ length: 24 }, (_, hour) => {
              const data = stats.hourlyDistribution.find(d => d.hour === hour);
              const count = data?.count || 0;
              const maxCount = Math.max(...stats.hourlyDistribution.map(d => d.count), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500/50 rounded-t transition-all hover:bg-blue-500/70" style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0px' }} title={`${hour}:00 - ${count} alerts`}></div>
                  <div className="text-xs text-gray-400 mt-1">{hour % 6 === 0 ? `${hour}h` : ''}</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Weekly Growth</div>
          <div className="flex items-center gap-2">
            <div className="text-white text-lg font-bold">{stats.monthAlerts > 0 ? `+${Math.round(((stats.weekAlerts / (stats.monthAlerts / 4)) - 1) * 100)}%` : 'N/A'}</div>
            {stats.monthAlerts > 0 && stats.weekAlerts > (stats.monthAlerts / 4) && (<div className="text-green-400 text-sm">↗</div>)}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Avg Daily (7d)</div>
          <div className="text-white text-lg font-bold">{Math.round(stats.weekAlerts / 7)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Peak Hour Today</div>
          <div className="text-white text-lg font-bold">{stats.hourlyDistribution.length > 0 ? `${stats.hourlyDistribution.reduce((max, curr) => curr.count > max.count ? curr : max).hour}:00` : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};
