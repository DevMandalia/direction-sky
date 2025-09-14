'use client'

import React, { useState } from 'react';

interface TradingViewAlert {
  alertId: string;
  timestamp: Date;
  ticker: string;
  action: 'buy' | 'sell' | 'exit' | 'close';
  price?: number;
  sentiment?: 'bullish' | 'bearish' | 'flat';
  quantity?: number;
  strategyName?: string;
  alertMessage?: string;
  rawPayload: Record<string, any>;
  sourceIp?: string;
  userId?: string;
  alertCondition?: string;
  timeframe?: string;
  exchange?: string;
  marketPosition?: 'long' | 'short' | 'flat';
  processedAt?: Date;
  createdAt?: Date;
}

interface AlertCardProps {
  alert: TradingViewAlert;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getActionStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'buy':
        return { bg: 'bg-green-900/30', border: 'border-green-500/30', text: 'text-green-400', icon: '↗' };
      case 'sell':
        return { bg: 'bg-red-900/30', border: 'border-red-500/30', text: 'text-red-400', icon: '↘' };
      case 'exit':
      case 'close':
        return { bg: 'bg-yellow-900/30', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '⊗' };
      default:
        return { bg: 'bg-gray-900/30', border: 'border-gray-500/30', text: 'text-gray-400', icon: '•' };
    }
  };

  const getSentimentStyle = (sentiment?: string) => {
    if (!sentiment) return null;
    switch (sentiment.toLowerCase()) {
      case 'bullish':
        return { text: 'text-green-400', bg: 'bg-green-900/20' };
      case 'bearish':
        return { text: 'text-red-400', bg: 'bg-red-900/20' };
      case 'flat':
        return { text: 'text-gray-400', bg: 'bg-gray-900/20' };
      default:
        return { text: 'text-gray-400', bg: 'bg-gray-900/20' };
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(price);
  };

  const actionStyle = getActionStyle(alert.action);
  const sentimentStyle = getSentimentStyle(alert.sentiment);

  return (
    <div className={`rounded-lg border ${actionStyle.border} ${actionStyle.bg} p-4 transition-all hover:bg-opacity-50`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${actionStyle.text}`}>
            <span className="text-lg leading-none">{actionStyle.icon}</span>
            <span className="uppercase">{alert.action}</span>
          </div>
          <div className="text-white font-bold text-lg">{alert.ticker}</div>
          {alert.price && (<div className="text-gray-300 font-mono">{formatPrice(alert.price)}</div>)}
        </div>
        <div className="text-gray-400 text-sm">{getTimeAgo(alert.timestamp)}</div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-sm">
        {alert.sentiment && sentimentStyle && (
          <div className={`px-2 py-1 rounded ${sentimentStyle.bg} ${sentimentStyle.text}`}>{alert.sentiment}</div>
        )}
        {alert.quantity && (<div className="text-gray-400">Qty: <span className="text-white">{alert.quantity.toLocaleString()}</span></div>)}
        {alert.timeframe && (<div className="text-gray-400">{alert.timeframe}</div>)}
        {alert.exchange && (<div className="text-gray-400">{alert.exchange}</div>)}
      </div>

      {alert.alertMessage && (<div className="mb-3 p-2 bg-gray-800/50 rounded text-sm text-gray-300">"{alert.alertMessage}"</div>)}
      {alert.strategyName && (<div className="mb-3 text-sm text-gray-400">Strategy: <span className="text-white">{alert.strategyName}</span></div>)}

      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>ID: {alert.alertId.slice(-8)}</span>
          {alert.marketPosition && (<span>Position: {alert.marketPosition}</span>)}
        </div>
        <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-gray-400 hover:text-white transition-colors">{showDetails ? 'Hide Details' : 'Show Details'}</button>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Alert ID:</span>
              <div className="text-white font-mono text-xs">{alert.alertId}</div>
            </div>
            {alert.alertCondition && (
              <div>
                <span className="text-gray-400">Condition:</span>
                <div className="text-white text-xs">{alert.alertCondition}</div>
              </div>
            )}
            <div>
              <span className="text-gray-400">Triggered:</span>
              <div className="text-white text-xs">{alert.timestamp.toLocaleString()}</div>
            </div>
            {alert.processedAt && (
              <div>
                <span className="text-gray-400">Processed:</span>
                <div className="text-white text-xs">{alert.processedAt.toLocaleString()}</div>
              </div>
            )}
          </div>
          <div>
            <span className="text-gray-400 text-sm">Raw Payload:</span>
            <div className="mt-1 p-2 bg-gray-900/50 rounded text-xs font-mono text-gray-300 overflow-x-auto">
              <pre>{JSON.stringify(alert.rawPayload, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


