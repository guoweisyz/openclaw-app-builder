import React, { useEffect, useState } from 'react'
import { View } from '../App'
import { useExecutions, ExecutionStats } from '../hooks/useApi'

interface AppDetailProps {
  appId: string
  onNavigate: (view: View) => void
}

interface App {
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

interface ExecutionResult {
  success: boolean
  runId: string
  startedAt: string
  endedAt: string
  outputs: Record<string, any>
  error?: string
}

export function AppDetail({ appId, onNavigate }: AppDetailProps) {
  const [app, setApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const { executions, stats, loading: historyLoading, refresh } = useExecutions(appId)

  useEffect(() => {
    fetchApp()
  }, [appId])

  const fetchApp = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/apps/${appId}`)
      if (response.ok) {
        const data = await response.json()
        setApp(data)
      }
    } catch (err) {
      console.error('Failed to fetch app:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    try {
      setRunning(true)
      const response = await fetch(`http://localhost:3000/api/apps/${appId}/run`, {
        method: 'POST',
      })
      const result = await response.json()
      setLastResult(result)
      // 刷新执行历史
      setTimeout(() => refresh(), 500)
    } catch (err) {
      alert('运行失败')
    } finally {
      setRunning(false)
    }
  }

  const formatDuration = (startedAt: string, endedAt?: string) => {
    if (!endedAt) return '-'
    const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          应用未找到
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <button
        onClick={() => onNavigate('list')}
        className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
      >
        ← 返回列表
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{app.name}</h2>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                app.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : app.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {app.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{app.description}</p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          {running ? '运行中...' : '▶️ 运行应用'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* 工作流 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">工作流</h3>
            <div className="space-y-4">
              {app.workflow.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{step.name}</p>
                        <p className="text-sm text-gray-500">
                          {step.componentId} → {step.action}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 执行历史 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">执行历史</h3>
              <button
                onClick={() => refresh()}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                🔄 刷新
              </button>
            </div>
            
            {historyLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无执行记录</p>
                <p className="text-sm mt-1">点击"运行应用"开始第一次执行</p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className={`border rounded-lg p-4 ${
                      execution.status === 'success'
                        ? 'border-green-200 bg-green-50'
                        : execution.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            execution.status === 'success'
                              ? 'bg-green-500'
                              : execution.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        ></span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {execution.status === 'success'
                              ? '✅ 执行成功'
                              : execution.status === 'failed'
                              ? '❌ 执行失败'
                              : '⏳ 执行中'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(execution.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500">
                          耗时: {formatDuration(execution.startedAt, execution.endedAt)}
                        </p>
                        <p className="font-mono text-xs text-gray-400 mt-1">
                          {execution.id.slice(0, 20)}...
                        </p>
                      </div>
                    </div>
                    
                    {execution.error && (
                      <div className="mt-3 text-sm text-red-600 bg-red-100 rounded p-2">
                        {execution.error}
                      </div>
                    )}
                    
                    {execution.outputs && Object.keys(execution.outputs).length > 0 && (
                      <div className="mt-3">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                            查看输出
                          </summary>
                          <pre className="mt-2 bg-white rounded p-3 text-xs overflow-auto max-h-40">
                            {JSON.stringify(execution.outputs, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 最近一次执行结果 */}
          {lastResult && (
            <div className={`rounded-xl border p-6 ${
              lastResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">
                {lastResult.success ? '✅ 刚刚执行成功' : '❌ 刚刚执行失败'}
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">运行ID:</span> {lastResult.runId}</p>
                <p><span className="text-gray-500">开始时间:</span> {new Date(lastResult.startedAt).toLocaleString()}</p>
                <p><span className="text-gray-500">结束时间:</span> {new Date(lastResult.endedAt).toLocaleString()}</p>
                {lastResult.error && (
                  <p className="text-red-600">{lastResult.error}</p>
                )}
                {Object.keys(lastResult.outputs).length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-500 mb-2">输出:</p>
                    <pre className="bg-white rounded-lg p-3 text-xs overflow-auto">
                      {JSON.stringify(lastResult.outputs, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">基本信息</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">应用ID</p>
                <p className="font-mono text-gray-900">{app.id}</p>
              </div>
              <div>
                <p className="text-gray-500">触发方式</p>
                <p className="text-gray-900">{app.trigger.type}</p>
                {app.trigger.config?.cron && (
                  <p className="font-mono text-gray-600">{app.trigger.config.cron}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500">创建时间</p>
                <p className="text-gray-900">{new Date(app.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">执行统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{app.workflow.length}</p>
                <p className="text-sm text-gray-500">工作流步骤</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats?.total || 0}</p>
                <p className="text-sm text-gray-500">总执行次数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats?.success || 0}</p>
                <p className="text-sm text-gray-500">成功</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats?.failed || 0}</p>
                <p className="text-sm text-gray-500">失败</p>
              </div>
            </div>
            {stats?.lastRun && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">上次执行</p>
                <p className="text-sm text-gray-900">{new Date(stats.lastRun).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
