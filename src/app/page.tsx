'use client'

import React from 'react'
import { format, parseISO, isValid as isValidDate } from 'date-fns'

import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon
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
  last_updated?: string
  high?: number
  low?: number
  last_price?: number
  change?: number
  change_percent?: number
  score?: number
}

// BigQuery API configuration (must be provided via env)
const BIGQUERY_API_BASE = process.env.NEXT_PUBLIC_BIGQUERY_API_BASE
const API_KEY = process.env.NEXT_PUBLIC_BIGQUERY_API_KEY

export default function OptionsChain() {
  const [optionsData, setOptionsData] = useState<OptionsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [expiryDates, setExpiryDates] = useState<string[]>([])
  const [optionType, setOptionType] = useState<'all' | 'call' | 'put'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'strike_price' | 'volume' | 'open_interest' | 'implied_volatility'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)

  // Filters state
  const [underlyingAsset, setUnderlyingAsset] = useState<string>('')
  const [deltaMin, setDeltaMin] = useState<string>('')
  const [deltaMax, setDeltaMax] = useState<string>('')
  const [gammaMin, setGammaMin] = useState<string>('')
  const [gammaMax, setGammaMax] = useState<string>('')
  const [thetaMin, setThetaMin] = useState<string>('')
  const [thetaMax, setThetaMax] = useState<string>('')
  const [vegaMin, setVegaMin] = useState<string>('')
  const [vegaMax, setVegaMax] = useState<string>('')
  const [volumeMin, setVolumeMin] = useState<string>('')
  const [volumeMax, setVolumeMax] = useState<string>('')
  const [openInterestMin, setOpenInterestMin] = useState<string>('')
  const [openInterestMax, setOpenInterestMax] = useState<string>('')
  const [ivMin, setIvMin] = useState<string>('') // percent
  const [ivMax, setIvMax] = useState<string>('') // percent

  const formatDate = (value: any) => {
    if (!value) return '-'
    // If BigQuery DATE string 'YYYY-MM-DD', avoid timezone shifts by constructing local Date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map((v: string) => parseInt(v, 10))
      const dateObj = new Date(y, m - 1, d)
      return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy') : value
    }
    if (typeof value === 'object' && 'value' in value && typeof (value as any).value === 'string') {
      const raw = (value as any).value
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split('-').map((v: string) => parseInt(v, 10))
        const dateObj = new Date(y, m - 1, d)
        return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy') : raw
      }
      const dateObj = parseISO(raw)
      return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy') : raw
    }
    const dateObj = typeof value === 'string' ? parseISO(value) : new Date(value)
    return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy') : String(value)
  }

  const formatDateTime = (value: any) => {
    if (!value) return '-'
    if (typeof value === 'string') {
      const dateObj = parseISO(value)
      return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy HH:mm:ss') : value
    }
    if (typeof value === 'object' && 'value' in value && typeof (value as any).value === 'string') {
      const dateObj = parseISO((value as any).value)
      return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy HH:mm:ss') : String((value as any).value)
    }
    const dateObj = new Date(value)
    return isValidDate(dateObj) ? format(dateObj, 'MMM d, yyyy HH:mm:ss') : String(value)
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      if (!BIGQUERY_API_BASE) throw new Error('API base not configured')
      const ingestUrl = `${BIGQUERY_API_BASE}?action=fetch-and-store&symbol=MSTR${selectedExpiry ? `&expiry=${encodeURIComponent(selectedExpiry)}` : ''}`
      await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
        body: JSON.stringify({})
      })
    } catch (e) {
      console.error('Error triggering ingest:', e)
    } finally {
      await fetchOptionsData()
      await fetchLastFetchTime()
      setLoading(false)
    }
  }

  // Fetch options data from BigQuery
  const fetchOptionsData = async () => {
    try {
      setError(null)
      if (!BIGQUERY_API_BASE || BIGQUERY_API_BASE.includes('your-bigquery-api.com')) {
        throw new Error('BIGQUERY API is not configured. Set NEXT_PUBLIC_BIGQUERY_API_BASE (and key if required).')
      }
      
      // Build query with optional filters
      const conditions: string[] = []
      const parameters: { name: string; value: string }[] = []
      if (selectedExpiry) {
        conditions.push('expiration_date = @expiry_date')
        parameters.push({ name: 'expiry_date', value: selectedExpiry })
      }
      if (optionType !== 'all') {
        conditions.push('contract_type = @contract_type')
        parameters.push({ name: 'contract_type', value: optionType })
      }
      if (underlyingAsset) {
        conditions.push('underlying_asset = @underlying_asset')
        parameters.push({ name: 'underlying_asset', value: underlyingAsset.toUpperCase() })
      }
      // Numeric range filters (server-side when provided)
      const addNumericFilter = (field: string, minStr: string, maxStr: string, isPercent = false) => {
        const minVal = minStr.trim() === '' ? null : parseFloat(minStr)
        const maxVal = maxStr.trim() === '' ? null : parseFloat(maxStr)
        const toServer = (v: number) => isPercent ? String(v / 100) : String(v)
        if (minVal !== null && !Number.isNaN(minVal)) {
          conditions.push(`${field} >= @${field}_min`)
          parameters.push({ name: `${field}_min`, value: toServer(minVal) })
        }
        if (maxVal !== null && !Number.isNaN(maxVal)) {
          conditions.push(`${field} <= @${field}_max`)
          parameters.push({ name: `${field}_max`, value: toServer(maxVal) })
        }
      }

      addNumericFilter('delta', deltaMin, deltaMax)
      addNumericFilter('gamma', gammaMin, gammaMax)
      addNumericFilter('theta', thetaMin, thetaMax)
      addNumericFilter('vega', vegaMin, vegaMax)
      addNumericFilter('volume', volumeMin, volumeMax)
      addNumericFilter('open_interest', openInterestMin, openInterestMax)
      addNumericFilter('implied_volatility', ivMin, ivMax, true)
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const response = await fetch(`${BIGQUERY_API_BASE}/api/polygon-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          query: `
            -- Deduplicate to latest row per contract_id
            SELECT
              contract_id,
              underlying_asset,
              contract_type,
              strike_price,
              CAST(expiration_date AS STRING) AS expiration_date,
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
              high,
              low,
              last_price,
              change,
              change_percent,
              score,
              last_updated,
              quote_timestamp,
              trade_timestamp,
              insert_timestamp
            FROM (
              SELECT
                contract_id,
                underlying_asset,
                contract_type,
                strike_price,
                CAST(expiration_date AS STRING) AS expiration_date,
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
                high,
                low,
                last_price,
                change,
                change_percent,
                score,
                last_updated,
                quote_timestamp,
                trade_timestamp,
                insert_timestamp,
                ROW_NUMBER() OVER (
                  PARTITION BY contract_id
                  ORDER BY last_updated DESC, quote_timestamp DESC, trade_timestamp DESC, insert_timestamp DESC
                ) AS rn
              FROM \`dev-epsilon-467101-v2.direction_sky_data.polygon_options\`
              ${whereClause}
            )
            WHERE rn = 1
            ORDER BY score DESC, strike_price ASC
          `,
          parameters
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
        timestamp: row.quote_timestamp || row.trade_timestamp || row.last_updated || row.insert_timestamp || null,
        last_updated: row.last_updated || null,
        high: row.high ? parseFloat(row.high) : undefined,
        low: row.low ? parseFloat(row.low) : undefined,
        last_price: row.last_price ? parseFloat(row.last_price) : undefined,
        change: row.change ? parseFloat(row.change) : undefined,
        change_percent: row.change_percent ? parseFloat(row.change_percent) : undefined,
        score: row.score ? parseFloat(row.score) : undefined
      })) || []

      setOptionsData(transformedData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching options data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch options data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch last fetch time (MAX last_updated from BigQuery)
  const fetchLastFetchTime = async () => {
    try {
      if (!BIGQUERY_API_BASE || BIGQUERY_API_BASE.includes('your-bigquery-api.com')) {
        throw new Error('BIGQUERY API is not configured. Set NEXT_PUBLIC_BIGQUERY_API_BASE (and key if required).')
      }
      const response = await fetch(`${BIGQUERY_API_BASE}/api/polygon-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          query: `
            SELECT MAX(last_updated) AS last_updated
            FROM \`dev-epsilon-467101-v2.direction_sky_data.polygon_options\`
          `,
          parameters: []
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const raw = data.rows?.[0]?.last_updated ?? data.rows?.[0]?.last_updated?.value
      if (raw) {
        const parsed = typeof raw === 'string' ? new Date(raw) : (raw?.value ? new Date(raw.value) : new Date(raw))
        if (!isNaN(parsed.getTime())) setLastFetchTime(parsed)
      }
    } catch (e) {
      // Non-fatal; just leave lastFetchTime as-is
      console.error('Error fetching last fetch time:', e)
    }
  }

  // Fetch expiry dates from BigQuery
  const fetchExpiryDates = async () => {
    try {
      if (!BIGQUERY_API_BASE || BIGQUERY_API_BASE.includes('your-bigquery-api.com')) {
        throw new Error('BIGQUERY API is not configured. Set NEXT_PUBLIC_BIGQUERY_API_BASE (and key if required).')
      }
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
      const dates: string[] = data.dates || []
      setExpiryDates(dates)
    } catch (error) {
      console.error('Error fetching expiry dates:', error)
      setError(prev => prev || (error instanceof Error ? error.message : 'Failed to fetch expiry dates'))
    }
  }

  useEffect(() => {
    fetchExpiryDates()
    fetchOptionsData()
    fetchLastFetchTime()
  }, [])

  // Set up real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOptionsData()
      fetchLastFetchTime()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Refetch when filters change
  useEffect(() => {
    fetchOptionsData()
  }, [selectedExpiry, optionType, underlyingAsset, deltaMin, deltaMax, gammaMin, gammaMax, thetaMin, thetaMax, vegaMin, vegaMax, volumeMin, volumeMax, openInterestMin, openInterestMax, ivMin, ivMax])

  const withinRange = (value: number | undefined, minStr: string, maxStr: string, isPercent = false) => {
    const hasFilter = (minStr.trim() !== '' || maxStr.trim() !== '')
    const minVal = minStr.trim() === '' ? null : parseFloat(minStr)
    const maxVal = maxStr.trim() === '' ? null : parseFloat(maxStr)
    const actual = typeof value === 'number' ? (isPercent ? value * 100 : value) : undefined
    if (!hasFilter) return true
    if (actual === undefined) return false
    if (minVal !== null && !Number.isNaN(minVal) && actual < minVal) return false
    if (maxVal !== null && !Number.isNaN(maxVal) && actual > maxVal) return false
    return true
  }

  const filteredData = optionsData.filter(option => {
    if (searchTerm && !option.strike_price.toString().includes(searchTerm)) return false
    if (optionType !== 'all' && option.contract_type !== optionType) return false
    if (selectedExpiry && option.expiration_date !== selectedExpiry) return false
    if (underlyingAsset && option.underlying_asset?.toUpperCase() !== underlyingAsset.toUpperCase()) return false
    if (!withinRange(option.delta, deltaMin, deltaMax)) return false
    if (!withinRange(option.gamma, gammaMin, gammaMax)) return false
    if (!withinRange(option.theta, thetaMin, thetaMax)) return false
    if (!withinRange(option.vega, vegaMin, vegaMax)) return false
    if (!withinRange(option.volume, volumeMin, volumeMax)) return false
    if (!withinRange(option.open_interest, openInterestMin, openInterestMax)) return false
    if (!withinRange(option.implied_volatility, ivMin, ivMax, true)) return false
    return true
  })

  const sortedOptions = [...filteredData].sort((a, b) => {
    const aValue = (a as any)[sortBy] ?? -Infinity
    const bValue = (b as any)[sortBy] ?? -Infinity
    if (aValue === bValue) {
      // tie-breaker by strike price ascending
      return a.strike_price - b.strike_price
    }
    return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
  })

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'score' ? 'desc' : 'asc')
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
            <span className="text-gray-300">{option.contract_id}</span>
            <button
              type="button"
              title="Copy contract ID"
              aria-label={`Copy ${option.contract_id}`}
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(option.contract_id).catch(() => {}) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(option.contract_id).catch(() => {}) } }}
              className="inline-flex items-center justify-center rounded p-1 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </td>
        <td className="px-2 py-1 text-[12px]">{option.contract_type?.toUpperCase()}</td>
        <td className="px-2 py-1 text-[12px]">{formatDate(option.expiration_date)}</td>
        <td className="px-2 py-1 text-[12px]">${option.strike_price}</td>
        <td className="px-2 py-1 text-[12px] text-green-400">${option.bid?.toFixed(2) || '-'}</td>
        <td className="px-2 py-1 text-[12px] text-red-400">${option.ask?.toFixed(2) || '-'}</td>
        <td className="px-2 py-1 text-[12px]">{option.volume?.toLocaleString() || '-'}</td>
        <td className="px-2 py-1 text-[12px]">{option.open_interest?.toLocaleString() || '-'}</td>
        <td className="px-2 py-1 text-[12px]">{typeof option.implied_volatility === 'number' ? `${(option.implied_volatility * 100).toFixed(1)}%` : '-'}</td>
        <td className="px-2 py-1 text-[12px]">{option.score?.toFixed(2) || '-'}</td>
        
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="px-0 py-0">
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
              <img src="/rocket.svg" alt="Direction Sky rocketship logo" className="w-8 h-8" />
              <h1 className="text-xl font-bold">Direction Sky Options</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                <span className="text-green-400">{underlyingAsset ? underlyingAsset.toUpperCase() : 'MSTR'}</span>
                <span className="ml-2">${optionsData[0]?.underlying_price?.toFixed(2) || '0.00'}</span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-busy={loading}>
        {loading && (
          <div className="mb-3 h-1 w-full bg-gray-700/70 rounded overflow-hidden">
            <div className="h-1 w-1/3 bg-blue-500 animate-pulse"></div>
          </div>
        )}
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-2" role="tablist" aria-label="Option type tabs">
            <button
              type="button"
              onClick={() => setOptionType('all')}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md border text-sm ${optionType === 'all' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
              role="tab"
              aria-selected={optionType === 'all'}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setOptionType('call')}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md border text-sm ${optionType === 'call' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
              role="tab"
              aria-selected={optionType === 'call'}
            >
              Calls
            </button>
            <button
              type="button"
              onClick={() => setOptionType('put')}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md border text-sm ${optionType === 'put' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
              role="tab"
              aria-selected={optionType === 'put'}
            >
              Puts
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 mr-2" aria-live="polite">
              Last fetch: {lastFetchTime ? formatDateTime(lastFetchTime) : '—'}
            </div>
            <label className="text-sm text-gray-300" htmlFor="expiry-select">Expiry</label>
            <select
              id="expiry-select"
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              disabled={loading}
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Expiration date"
            >
              <option value="">All</option>
              {expiryDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="ml-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-1.5 px-3 rounded-md text-sm transition-colors duration-200"
              aria-label="Refresh data"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mb-6 items-end">
          <div className="w-56">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search Strike</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter strike price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="underlying-asset">Underlying Asset</label>
            <input
              id="underlying-asset"
              type="text"
              inputMode="text"
              placeholder="e.g. MSTR"
              value={underlyingAsset}
              onChange={(e) => setUnderlyingAsset(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              aria-label="Underlying asset ticker"
            />
          </div>
          {/* Inline Filters */}
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Delta</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" placeholder="Min" value={deltaMin} onChange={(e) => setDeltaMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Delta min" />
              <input type="number" step="0.01" placeholder="Max" value={deltaMax} onChange={(e) => setDeltaMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Delta max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Gamma</label>
            <div className="flex gap-2">
              <input type="number" step="0.0001" placeholder="Min" value={gammaMin} onChange={(e) => setGammaMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Gamma min" />
              <input type="number" step="0.0001" placeholder="Max" value={gammaMax} onChange={(e) => setGammaMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Gamma max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Theta</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" placeholder="Min" value={thetaMin} onChange={(e) => setThetaMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Theta min" />
              <input type="number" step="0.01" placeholder="Max" value={thetaMax} onChange={(e) => setThetaMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Theta max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Vega</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" placeholder="Min" value={vegaMin} onChange={(e) => setVegaMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Vega min" />
              <input type="number" step="0.01" placeholder="Max" value={vegaMax} onChange={(e) => setVegaMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Vega max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Volume</label>
            <div className="flex gap-2">
              <input type="number" step="1" placeholder="Min" value={volumeMin} onChange={(e) => setVolumeMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Volume min" />
              <input type="number" step="1" placeholder="Max" value={volumeMax} onChange={(e) => setVolumeMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Volume max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">Open Interest</label>
            <div className="flex gap-2">
              <input type="number" step="1" placeholder="Min" value={openInterestMin} onChange={(e) => setOpenInterestMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Open interest min" />
              <input type="number" step="1" placeholder="Max" value={openInterestMax} onChange={(e) => setOpenInterestMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Open interest max" />
            </div>
          </div>
          <div className="max-w-56 w-56">
            <label className="block text-sm font-medium text-gray-300 mb-1">IV %</label>
            <div className="flex gap-2">
              <input type="number" step="0.1" placeholder="Min %" value={ivMin} onChange={(e) => setIvMin(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="IV min percent" />
              <input type="number" step="0.1" placeholder="Max %" value={ivMax} onChange={(e) => setIvMax(e.target.value)} className="w-1/2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="IV max percent" />
            </div>
          </div>
        </div>

        {/* Filters are shown inline above; removed toggle section */}

        {/* Options List (Score Desc) */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 relative">
          <div className="border-b border-gray-700 p-4">
            <h2 className="text-lg font-semibold flex items-center justify-between">
              <span>Options (sorted by Score)</span>
              <span className="text-sm font-normal text-gray-400">{sortedOptions.length} options loaded</span>
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider">Contract</th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider">Expiry</th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('strike_price')}>
                    <div className="flex items-center space-x-1">
                      <span>Strike</span>
                      {sortBy === 'strike_price' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider">Bid</th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider">Ask</th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('volume')}>
                    <div className="flex items-center space-x-1">
                      <span>Vol</span>
                      {sortBy === 'volume' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('open_interest')}>
                    <div className="flex items-center space-x-1">
                      <span>OI</span>
                      {sortBy === 'open_interest' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('implied_volatility')}>
                    <div className="flex items-center space-x-1">
                      <span>IV</span>
                      {sortBy === 'implied_volatility' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-[11px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('score')}>
                    <div className="flex items-center space-x-1">
                      <span>Score</span>
                      {sortBy === 'score' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedOptions.map((option) => (
                  <OptionRow 
                    key={option.contract_id} 
                    option={option} 
                    isExpanded={expandedOptions.has(option.contract_id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-gray-200">
                <div className="h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Refreshing data…</span>
              </div>
            </div>
          )}
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