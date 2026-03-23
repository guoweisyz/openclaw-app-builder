import React, { useState } from 'react'
import { View } from '../App'
import { useApps, useIntent } from '../hooks/useApi'

interface CreateAppProps {
  onNavigate: (view: View, appId?: string) => void
}

export function CreateApp({ onNavigate }: CreateAppProps) {
  const [description, setDescription] = useState('')
  const [step, setStep] = useState<'input' | 'preview' | 'creating'>('input')
  const { parseIntent, parsedIntent, loading: parsing } = useIntent()
  const { createApp, loading: creating } = useApps()

  const handleParse = async () => {
    if (!description.trim()) return
    await parseIntent(description)
    setStep('preview')
  }

  const handleCreate = async () => {
    try {
      setStep('creating')
      const app = await createApp(description)
      onNavigate('detail', app.id)
    } catch (err) {
      setStep('preview')
      alert('创建失败')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">创建应用</h2>

      {step === 'input' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            描述你的应用
          </label>
          <p className="text-sm text-gray-500 mb-4">
            用自然语言描述你想实现的功能，例如："每天早上8点推送天气到飞书"
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="每天早上8点推送天气到飞书..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleParse}
              disabled={!description.trim() || parsing}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
            >
              {parsing ? '分析中...' : '下一步'}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && parsedIntent && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">应用预览</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">目标</p>
                  <p className="font-medium text-gray-900">{parsedIntent.parsed.goal}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">定时</p>
                  <p className="font-medium text-gray-900">
                    {parsedIntent.parsed.schedule || '手动触发'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">动作</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {parsedIntent.parsed.actions.map((action: string) => (
                      <span key={action} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">数据源</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {parsedIntent.parsed.dataSources.map((source: string) => (
                      <span key={source} className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600">目的地</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {parsedIntent.parsed.destinations.map((dest: string) => (
                      <span key={dest} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">
                        {dest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700 mb-2">
                  置信度: {Math.round(parsedIntent.confidence * 100)}%
                </p>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${parsedIntent.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('input')}
              className="text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              ← 返回修改
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
            >
              {creating ? '创建中...' : '✨ 创建应用'}
            </button>
          </div>
        </div>
      )}

      {step === 'creating' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <h3 className="text-lg font-medium text-gray-900">正在创建应用...</h3>
          <p className="text-gray-500 mt-2">请稍候</p>
        </div>
      )}
    </div>
  )
}
