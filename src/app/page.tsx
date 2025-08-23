'use client'

import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface OptionsData {
  contract_id: string
  underlying_asset: string
  contract_type: 'call' | 'put'
  strike_price: number
  expiration_date: string
  bid: number
  ask: number
  bid_size: number
  ask_size: number
  volume: number
  open_interest: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  implied_volatility?: number
  underlying_price: number
  timestamp: string
  high?: number
  low?: number
  last_price?: number
  change?: number
  change_percent?: number
  score?: number
}

// BigQuery API configuration
const BIGQUERY_API_BASE = process.env.NEXT_PUBLIC_BIGQUERY_API_BASE || 'https://your-bigquery-api.com'
const API_KEY = process.env.NEXT_PUBLIC_BIGQUERY_API_KEY

export default function OptionsChain() {
  const [optionsData, setOptionsData] = useState<OptionsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [expiryDates, setExpiryDates] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'strike' | 'volume' | 'oi' | 'iv'>('strike')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Fetch options data from BigQuery
  const fetchOptionsData = async () => {
    try {
      setError(null)
      
      // TODO: Replace with your actual BigQuery API endpoint
      // This could be a Cloud Function, Cloud Run service, or direct BigQuery connection
      const response = await fetch(`${BIGQUERY_API_BASE}/api/polygon-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          query: `
            SELECT 
              contract_id,
              underlying_asset,
              contract_type,
              strike_price,
              expiration_date,
              bid,
              ask,
              bid_size,
              ask_size,
              volume,
              open_interest,
              delta,
              gamma,
              theta,
              vega,
              implied_volatility,
              underlying_price,
              timestamp,
              high,
              low,
              last_price,
              change,
              change_percent,
              score
            FROM \`dev-epsilon-467101-v2.direction_sky_data.polygon_options\`
            WHERE expiration_date = @expiry_date
            ORDER BY strike_price ASC
          `,
          parameters: [
            {
              name: 'expiry_date',
              value: selectedExpiry || new Date().toISOString().split('T')[0]
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Transform BigQuery response to match our interface
      const transformedData: OptionsData[] = data.rows?.map((row: any) => ({
        contract_id: row.contract_id,
        underlying_asset: row.underlying_asset,
        contract_type: row.contract_type,
        strike_price: parseFloat(row.strike_price),
        expiration_date: row.expiration_date,
        bid: parseFloat(row.bid) || 0,
        ask: parseFloat(row.ask) || 0,
        bid_size: parseInt(row.bid_size) || 0,
        ask_size: parseInt(row.ask_size) || 0,
        volume: parseInt(row.volume) || 0,
        open_interest: parseInt(row.open_interest) || 0,
        delta: row.delta ? parseFloat(row.delta) : undefined,
        gamma: row.gamma ? parseFloat(row.gamma) : undefined,
        theta: row.theta ? parseFloat(row.theta) : undefined,
        vega: row.vega ? parseFloat(row.vega) : undefined,
        implied_volatility: row.implied_volatility ? parseFloat(row.implied_volatility) : undefined,
        underlying_price: parseFloat(row.underlying_price) || 0,
        timestamp: row.timestamp,
        high: row.high ? parseFloat(row.high) : undefined,
        low: row.low ? parseFloat(row.low) : undefined,
        last_price: row.last_price ? parseFloat(row.last_price) : undefined,
        change: row.change ? parseFloat(row.change) : undefined,
        change_percent: row.change_percent ? parseFloat(row.change_percent) : undefined,
        score: row.score ? parseFloat(row.score) : undefined
      })) || []

      setOptionsData(transformedData)
      setLastUpdated(new Date())
      
      // Extract unique expiry dates if not already set
      if (expiryDates.length === 0) {
        const dates = [...new Set(transformedData.map(option => option.expiration_date))].sort()
        setExpiryDates(dates)
        if (dates.length > 0 && !selectedExpiry) {
          setSelectedExpiry(dates[0])
        }
      }

    } catch (error) {
      console.error('Error fetching options data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch options data')
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock data for development')
        const mockData: OptionsData[] = [
          // Calls
          {
            contract_id: 'MSTR240119C00100000',
            underlying_asset: 'MSTR',
            contract_type: 'call',
            strike_price: 100,
            expiration_date: '2024-01-19',
            bid: 45.50,
            ask: 46.20,
            bid_size: 10,
            ask_size: 15,
            volume: 1250,
            open_interest: 3420,
            delta: 0.85,
            gamma: 0.02,
            theta: -0.15,
            vega: 0.08,
            implied_volatility: 0.45,
            underlying_price: 145.67,
            timestamp: new Date().toISOString(),
            high: 47.80,
            low: 44.20,
            last_price: 45.85,
            change: 0.35,
            change_percent: 0.77,
            score: 0.95
          },
          // Add more mock data as needed...
        ]
        setOptionsData(mockData)
        setExpiryDates(['2024-01-19'])
        setSelectedExpiry('2024-01-19')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch expiry dates from BigQuery
  const fetchExpiryDates = async () => {
    try {
      const response = await fetch(`${BIGQUERY_API_BASE}/api/polygon-options/expiry-dates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const dates = data.dates || []
      setExpiryDates(dates)
      
      if (dates.length > 0 && !selectedExpiry) {
        setSelectedExpiry(dates[0])
      }
    } catch (error) {
      console.error('Error fetching expiry dates:', error)
      // Fallback to current date + next few months
      const today = new Date()
      const fallbackDates = []
      for (let i = 0; i < 6; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 19)
        fallbackDates.push(date.toISOString().split('T')[0])
      }
      setExpiryDates(fallbackDates)
      setSelectedExpiry(fallbackDates[0])
    }
  }

  useEffect(() => {
    fetchExpiryDates()
  }, [])

  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionsData()
    }
  }, [selectedExpiry])

  // Set up real-time updates every 30 seconds
  useEffect(() => {
    if (!selectedExpiry) return
    
    const interval = setInterval(() => {
      fetchOptionsData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [selectedExpiry])

  const filteredData = optionsData.filter(option => 
    option.expiration_date === selectedExpiry &&
    (searchTerm === '' || option.strike_price.toString().includes(searchTerm))
  )

  const calls = filteredData.filter(option => option.contract_type === 'call')
  const puts = filteredData.filter(option => option.contract_type === 'put')

  const sortedCalls = [...calls].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1
    }
  })

  const sortedPuts = [...puts].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1
    }
  })

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const toggleOptionExpansion = (contractId: string) => {
    const newExpanded = new Set(expandedOptions)
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId)
    } else {
      newExpanded.add(contractId)
    }
    setExpandedOptions(newExpanded)
  }

  const OptionRow = ({ option, isExpanded }: { option: OptionsData; isExpanded: boolean }) => (
    <>
      <tr 
        key={option.contract_id} 
        className="hover:bg-gray-700/50 cursor-pointer"
        onClick={() => toggleOptionExpansion(option.contract_id)}
      >
        <td className="px-3 py-2 text-sm font-medium">
          <div className="flex items-center space-x-2">
            <ChevronRightIcon 
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <span>${option.strike_price}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-green-400">${option.bid?.toFixed(2) || '-'}</td>
        <td className="px-3 py-2 text-sm text-red-400">${option.ask?.toFixed(2) || '-'}</td>
        <td className="px-3 py-2 text-sm">{option.volume?.toLocaleString() || '-'}</td>
        <td className="px-3 py-2 text-sm">{option.open_interest?.toLocaleString() || '-'}</td>
        <td className="px-3 py-2 text-sm">{(option.implied_volatility * 100)?.toFixed(1) || '-'}%</td>
        <td className="px-3 py-2 text-sm">{option.score?.toFixed(2) || '-'}</td>
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-0 py-0">
            <div className="bg-gray-700/30 border-t border-gray-600">
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Price Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Price Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Price:</span>
                        <span className="text-white">${option.last_price?.toFixed(2) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Change:</span>
                        <span className={`${(option.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {option.change ? (option.change >= 0 ? '+' : '') + option.change.toFixed(2) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Change %:</span>
                        <span className={`${(option.change_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {option.change_percent ? (option.change_percent >= 0 ? '+' : '') + option.change_percent.toFixed(2) + '%' : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">High:</span>
                        <span className="text-white">${option.high?.toFixed(2) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Low:</span>
                        <span className="text-white">${option.low?.toFixed(2) || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bid/Ask Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Bid/Ask Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bid Size:</span>
                        <span className="text-white">{option.bid_size?.toLocaleString() || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ask Size:</span>
                        <span className="text-white">{option.ask_size?.toLocaleString() || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Spread:</span>
                        <span className="text-white">${((option.ask || 0) - (option.bid || 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mid:</span>
                        <span className="text-white">${(((option.bid || 0) + (option.ask || 0)) / 2).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Greeks */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Greeks</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Delta:</span>
                        <span className="text-white">{option.delta?.toFixed(4) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gamma:</span>
                        <span className="text-white">{option.gamma?.toFixed(4) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Theta:</span>
                        <span className="text-white">{option.theta?.toFixed(4) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vega:</span>
                        <span className="text-white">{option.vega?.toFixed(4) || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )

  if (loading && optionsData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
              <h1 className="text-xl font-bold">Direction Sky Options</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                <span className="text-green-400">MSTR</span>
                <span className="ml-2">${optionsData[0]?.underlying_price?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="text-xs text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 font-medium">Error:</span>
              <span className="text-red-300">{error}</span>
            </div>
            <button 
              onClick={() => fetchOptionsData()}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Expiration Date</label>
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {expiryDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search Strike</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter strike price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => fetchOptionsData()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Options Chain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calls */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="bg-green-900/20 border-b border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-green-400">Calls</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('strike')}>
                      <div className="flex items-center space-x-1">
                        <span>Strike</span>
                        {sortBy === 'strike' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bid</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ask</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('volume')}>
                      <div className="flex items-center space-x-1">
                        <span>Vol</span>
                        {sortBy === 'volume' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('oi')}>
                      <div className="flex items-center space-x-1">
                        <span>OI</span>
                        {sortBy === 'oi' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('iv')}>
                      <div className="flex items-center space-x-1">
                        <span>IV</span>
                        {sortBy === 'iv' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedCalls.map((option) => (
                    <OptionRow 
                      key={option.contract_id} 
                      option={option} 
                      isExpanded={expandedOptions.has(option.contract_id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Puts */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="bg-red-900/20 border-b border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-red-400">Puts</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('strike')}>
                      <div className="flex items-center space-x-1">
                        <span>Strike</span>
                        {sortBy === 'strike' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bid</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ask</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('volume')}>
                      <div className="flex items-center space-x-1">
                        <span>Vol</span>
                        {sortBy === 'volume' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('oi')}>
                      <div className="flex items-center space-x-1">
                        <span>OI</span>
                        {sortBy === 'oi' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('iv')}>
                      <div className="flex items-center space-x-1">
                        <span>IV</span>
                        {sortBy === 'iv' && (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedPuts.map((option) => (
                    <OptionRow 
                      key={option.contract_id} 
                      option={option} 
                      isExpanded={expandedOptions.has(option.contract_id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Greeks Info */}
        <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-4">Greeks & Risk Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Delta:</span>
              <span className="ml-2 text-blue-400">Rate of change in option price vs underlying</span>
            </div>
            <div>
              <span className="text-gray-400">Gamma:</span>
              <span className="ml-2 text-blue-400">Rate of change in delta</span>
            </div>
            <div>
              <span className="text-gray-400">Theta:</span>
              <span className="ml-2 text-blue-400">Time decay of option value</span>
            </div>
            <div>
              <span className="text-gray-400">Vega:</span>
              <span className="ml-2 text-blue-400">Sensitivity to volatility changes</span>
            </div>
            <div>
              <span className="text-gray-400">IV:</span>
              <span className="ml-2 text-blue-400">Implied volatility percentage</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 