'use client'

import React from 'react';
import { AlertCard } from './AlertCard';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface AlertsListProps {
  alerts: TradingViewAlert[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({ alerts, loading, pagination, onPageChange }) => {
  if (loading && alerts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
          <div className="animate-pulse bg-gray-700 h-4 w-20 rounded"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-6 bg-gray-700 rounded"></div>
                  <div className="w-16 h-6 bg-gray-700 rounded"></div>
                </div>
                <div className="w-24 h-4 bg-gray-700 rounded"></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-gray-700 rounded"></div>
                <div className="w-16 h-4 bg-gray-700 rounded"></div>
                <div className="w-24 h-4 bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loading && alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No alerts found</h3>
        <p className="text-gray-400 mb-4">No TradingView alerts match your current filters.</p>
        <div className="text-sm text-gray-500">
          <p>To receive alerts:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Set up TradingView alerts with webhook notifications</li>
            <li>Configure your webhook URL in TradingView</li>
            <li>Ensure your alerts send JSON formatted messages</li>
          </ol>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Recent Alerts
          {pagination.total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({pagination.total.toLocaleString()} total)</span>
          )}
        </h3>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Loading...
          </div>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.alertId} alert={alert} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} alerts
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1 || loading} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors">Previous</button>
            <div className="flex items-center gap-1">
              {pagination.page > 3 && (
                <>
                  <button onClick={() => onPageChange(1)} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">1</button>
                  {pagination.page > 4 && (<span className="px-2 text-gray-400">...</span>)}
                </>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, pagination.page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => onPageChange(pageNum)} disabled={loading} className={`px-3 py-1 text-sm rounded transition-colors ${pageNum === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>{pageNum}</button>
                );
              })}
              {pagination.page < totalPages - 2 && (
                <>
                  {pagination.page < totalPages - 3 && (<span className="px-2 text-gray-400">...</span>)}
                  <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">{totalPages}</button>
                </>
              )}
            </div>
            <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= totalPages || loading} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors">Next</button>
          </div>
        </div>
      )}

      {pagination.hasMore && (
        <div className="sm:hidden flex justify-center pt-4">
          <button onClick={() => onPageChange(pagination.page + 1)} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors">{loading ? 'Loading...' : 'Load More'}</button>
        </div>
      )}
    </div>
  );
};


