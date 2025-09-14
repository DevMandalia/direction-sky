'use client'

// AlertsTab.tsx - Main alerts tab component
// Following the existing component patterns in direction-sky project

import React, { useState, useEffect, useCallback } from 'react';
import { AlertsList } from './AlertsList';
import { AlertFilters } from './AlertFilters';
import { AlertStats } from './AlertStats';
import { AlertsRealTime } from './AlertsRealTime';

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

interface AlertStatsType {
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

const API_BASE_URL = process.env.NEXT_PUBLIC_TRADINGVIEW_API_URL || 'https://your-region-your-project.cloudfunctions.net/tradingview-alerts-api';

export const AlertsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<TradingViewAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertsStats, setAlertsStats] = useState<AlertStatsType | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filters, setFilters] = useState<AlertFiltersType>({ ticker: 'all', action: 'all', sentiment: 'all', page: 1, limit: 50 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, hasMore: false });
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async (currentFilters: AlertFiltersType = filters) => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const queryParams = new URLSearchParams();
      if (currentFilters.ticker && currentFilters.ticker !== 'all') queryParams.append('ticker', currentFilters.ticker);
      if (currentFilters.action && currentFilters.action !== 'all') queryParams.append('action', currentFilters.action);
      if (currentFilters.sentiment && currentFilters.sentiment !== 'all') queryParams.append('sentiment', currentFilters.sentiment);
      if (currentFilters.dateFrom) queryParams.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) queryParams.append('dateTo', currentFilters.dateTo);
      if (currentFilters.strategyName) queryParams.append('strategyName', currentFilters.strategyName);
      queryParams.append('page', String(currentFilters.page || 1));
      queryParams.append('limit', String(currentFilters.limit || 50));

      const response = await fetch(`${API_BASE_URL}/alerts?${queryParams.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const alertsWithDates = data.data.alerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          processedAt: alert.processedAt ? new Date(alert.processedAt) : undefined,
          createdAt: alert.createdAt ? new Date(alert.createdAt) : undefined
        }));
        setAlerts(alertsWithDates);
        setPagination(data.data.pagination);
        setLastFetchTime(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch alerts');
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlertsError(error instanceof Error ? error.message : 'Failed to fetch alerts');
    } finally {
      setAlertsLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setAlertsStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<AlertFiltersType>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    fetchAlerts(updatedFilters);
  }, [filters, fetchAlerts]);

  const handlePageChange = useCallback((newPage: number) => {
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);
    fetchAlerts(updatedFilters);
  }, [filters, fetchAlerts]);

  const handleNewAlert = useCallback((newAlert: TradingViewAlert) => {
    setAlerts(prevAlerts => {
      const filteredAlerts = prevAlerts.filter(alert => alert.alertId !== newAlert.alertId);
      return [newAlert, ...filteredAlerts].slice(0, filters.limit || 50);
    });
    fetchStats();
  }, [filters.limit, fetchStats]);

  const handleRefresh = useCallback(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!realTimeEnabled) {
      const interval = setInterval(() => { fetchAlerts(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [realTimeEnabled, fetchAlerts]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Trading Alerts</h2>
          <p className="text-gray-400 mt-1">
            TradingView webhook alerts and signals
            {lastFetchTime && (
              <span className="ml-2 text-sm">Last updated: {lastFetchTime.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={realTimeEnabled} onChange={(e) => setRealTimeEnabled(e.target.checked)} className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" />
            Real-time
          </label>
          <button onClick={handleRefresh} disabled={alertsLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
            {alertsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <AlertStats stats={alertsStats} loading={statsLoading} />

      <AlertFilters filters={filters} onFilterChange={handleFilterChange} loading={alertsLoading} />

      {alertsError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-400 font-medium">Error loading alerts</span>
          </div>
          <p className="text-red-300 mt-1 text-sm">{alertsError}</p>
          <button onClick={handleRefresh} className="mt-2 text-red-400 hover:text-red-300 text-sm underline">Try again</button>
        </div>
      )}

      <AlertsList alerts={alerts} loading={alertsLoading} pagination={pagination} onPageChange={handlePageChange} />

      {realTimeEnabled && (
        <AlertsRealTime onNewAlert={handleNewAlert} apiUrl={API_BASE_URL} />
      )}
    </div>
  );
};


