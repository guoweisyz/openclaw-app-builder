import React from 'react'
import { View } from '../App'
import { useApps } from '../hooks/useApi'

interface AppListProps {
  onNavigate: (view: View, appId?: string) => void
}

export function AppList({ onNavigate }: AppListProps) {
  const { apps, loading, error, runApp, refresh } = useApps()

  const handleRun = async (appId: string) => {
    try {
      const result = await runApp(appId)
      alert(result.success ? '运行成功！' : `运行失败: ${result.error}`)
    } catch (err) {
      alert('运行出错')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">加载失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的应用</h2>
          <p className="text-gray-500 mt-1">管理你的 AI 自动化应用</p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <span>➕</span>
          创建应用
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有应用</h3>
          <p className="text-gray-500 mb-6">创建你的第一个 AI 自动化应用</p>
          <button
            onClick={() => onNavigate('create')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            立即创建
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
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
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>触发: {app.trigger.type}</span>
                    <span>步骤: {app.workflow.length}</span>
                    <span>创建于: {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRun(app.id)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg font-medium text-sm"
                  >
                    ▶️ 运行
                  </button>
                  <button
                    onClick={() => onNavigate('detail', app.id)}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
