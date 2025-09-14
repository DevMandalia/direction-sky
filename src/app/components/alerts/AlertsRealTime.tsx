'use client'

import React, { useEffect, useRef, useState } from 'react';

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

interface AlertsRealTimeProps {
  onNewAlert: (alert: TradingViewAlert) => void;
  apiUrl: string;
}

export const AlertsRealTime: React.FC<AlertsRealTimeProps> = ({ onNewAlert, apiUrl }) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<Date>(new Date());
  const isActiveRef = useRef(true);

  const pollForNewAlerts = async () => {
    if (!isActiveRef.current) return;
    try {
      setConnectionStatus('connecting');
      const since = lastFetchRef.current.toISOString();
      const response = await fetch(`${apiUrl}/alerts?dateFrom=${since}&limit=10`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && data.data.alerts.length > 0) {
        const newAlerts = data.data.alerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          processedAt: alert.processedAt ? new Date(alert.processedAt) : undefined,
          createdAt: alert.createdAt ? new Date(alert.createdAt) : undefined
        }));
        newAlerts.sort((a: TradingViewAlert, b: TradingViewAlert) => a.timestamp.getTime() - b.timestamp.getTime())
          .forEach((alert: TradingViewAlert) => {
            if (alert.timestamp > lastFetchRef.current) {
              onNewAlert(alert);
              setLastAlertTime(alert.timestamp);
              setAlertCount(prev => prev + 1);
            }
          });
      }
      lastFetchRef.current = new Date();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Real-time polling error:', error);
      setConnectionStatus('error');
    }
  };

  const startPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pollForNewAlerts();
    intervalRef.current = setInterval(pollForNewAlerts, 5000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  useEffect(() => {
    isActiveRef.current = true;
    startPolling();
    return () => { isActiveRef.current = false; stopPolling(); };
  }, [apiUrl]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) { stopPolling(); } else if (isActiveRef.current) { startPolling(); }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, []);

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connecting': return { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: '⟳', text: 'Connecting...' };
      case 'connected': return { color: 'text-green-400', bg: 'bg-green-900/20', icon: '●', text: 'Live' };
      case 'error': return { color: 'text-red-400', bg: 'bg-red-900/20', icon: '⚠', text: 'Error' };
      default: return { color: 'text-gray-400', bg: 'bg-gray-900/20', icon: '○', text: 'Disconnected' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${status.bg} border border-gray-600 rounded-lg p-3 backdrop-blur-sm`}>
        <div className="flex items-center gap-2 text-sm">
          <span className={`${status.color} animate-pulse`}>{status.icon}</span>
          <span className="text-white font-medium">Real-time Updates</span>
          <span className={status.color}>{status.text}</span>
        </div>
        {connectionStatus === 'connected' && (
          <div className="mt-2 text-xs text-gray-400">
            <div>New alerts: {alertCount}</div>
            {lastAlertTime && (<div>Last: {lastAlertTime.toLocaleTimeString()}</div>)}
          </div>
        )}
        {connectionStatus === 'error' && (
          <div className="mt-2">
            <button onClick={startPolling} className="text-xs text-red-400 hover:text-red-300 underline">Retry Connection</button>
          </div>
        )}
      </div>
    </div>
  );
};


