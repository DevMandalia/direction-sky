'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  BellIcon, 
  CogIcon, 
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  marketCap: number
}

interface Alert {
  id: string
  type: 'confluence' | 'price' | 'volume'
  message: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
}

export default function Dashboard() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        // TODO: Replace with actual API call
        const mockData: MarketData[] = [
          {
            symbol: 'BTC',
            price: 43250.50,
            change24h: 2.34,
            volume: 28450000000,
            marketCap: 847500000000
          },
          {
            symbol: 'ETH',
            price: 2650.75,
            change24h: -1.23,
            volume: 15800000000,
            marketCap: 318500000000
          }
        ]
        
        const mockAlerts: Alert[] = [
          {
            id: '1',
            type: 'confluence',
            message: 'BTC showing strong confluence at $43,200 support level',
            timestamp: new Date().toISOString(),
            severity: 'high'
          }
        ]
        
        setMarketData(mockData)
        setAlerts(mockAlerts)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-crypto-blue rounded-lg"></div>
              <h1 className="text-xl font-bold text-gradient">Direction Sky</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <BellIcon className="h-6 w-6" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <CogIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Market Overview */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Market Overview</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {marketData.map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <CurrencyDollarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{asset.symbol}</h3>
                        <p className="text-sm text-gray-400">
                          ${asset.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center space-x-1 ${
                        asset.change24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'
                      }`}>
                        {asset.change24h >= 0 ? (
                          <TrendingUpIcon className="h-4 w-4" />
                        ) : (
                          <TrendingDownIcon className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Vol: ${(asset.volume / 1e9).toFixed(1)}B
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Active Alerts</h2>
                <span className="text-sm text-gray-400">{alerts.length} active</span>
              </div>
              
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'high' ? 'border-crypto-red bg-red-900/20' :
                    alert.severity === 'medium' ? 'border-crypto-yellow bg-yellow-900/20' :
                    'border-crypto-green bg-green-900/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.severity === 'high' ? 'bg-crypto-red text-white' :
                        alert.severity === 'medium' ? 'bg-crypto-yellow text-black' :
                        'bg-crypto-green text-black'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <BellIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mt-8">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Market Charts</h2>
              <div className="flex space-x-2">
                <button className="btn-secondary text-sm">1H</button>
                <button className="btn-primary text-sm">4H</button>
                <button className="btn-secondary text-sm">1D</button>
              </div>
            </div>
            
            <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Charts coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 