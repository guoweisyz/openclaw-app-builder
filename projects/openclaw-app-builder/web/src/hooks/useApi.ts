import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3000/api'

export interface App {
  id: string
  name: string
  description: string
  trigger: {
    type: string
    config?: Record<string, any>
  }
  workflow: any[]
  status: string
  createdAt: string
}

export function useApps() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/apps`)
      if (!response.ok) throw new Error('Failed to fetch apps')
      const data = await response.json()
      setApps(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const createApp = async (description: string, name?: string) => {
    try {
      const response = await fetch(`${API_BASE}/intent/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, name }),
      })
      if (!response.ok) throw new Error('Failed to create app')
      const data = await response.json()
      
      // Save the generated app
      const saveResponse = await fetch(`${API_BASE}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.app),
      })
      if (!saveResponse.ok) throw new Error('Failed to save app')
      
      await fetchApps()
      return data.app
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const runApp = async (appId: string) => {
    try {
      const response = await fetch(`${API_BASE}/apps/${appId}/run`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to run app')
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  return { apps, loading, error, createApp, runApp, refresh: fetchApps }
}

export function useIntent() {
  const [parsedIntent, setParsedIntent] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const parseIntent = async (description: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/intent/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (!response.ok) throw new Error('Failed to parse intent')
      const data = await response.json()
      setParsedIntent(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  return { parsedIntent, loading, parseIntent }
}

export interface Execution {
  id: string
  appId: string
  status: 'running' | 'success' | 'failed'
  startedAt: string
  endedAt?: string
  outputs?: Record<string, any>
  error?: string
}

export interface ExecutionStats {
  total: number
  success: number
  failed: number
  lastRun?: string
}

export function useExecutions(appId: string) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [stats, setStats] = useState<ExecutionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (appId) {
      fetchExecutions()
      fetchStats()
    }
  }, [appId])

  const fetchExecutions = async (limit = 50) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/apps/${appId}/executions?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch executions')
      const data = await response.json()
      setExecutions(data.executions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/apps/${appId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  return { executions, stats, loading, error, refresh: fetchExecutions }
}
