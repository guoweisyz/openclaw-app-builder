import React from 'react'
import { View } from '../App'

interface LayoutProps {
  children: React.ReactNode
  currentView: View
  onNavigate: (view: View) => void
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">🚀 App Builder</h1>
          <p className="text-sm text-gray-500 mt-1">让产品经理构建AI应用</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => onNavigate('list')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              currentView === 'list'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>📱</span>
            <span className="font-medium">我的应用</span>
          </button>
          
          <button
            onClick={() => onNavigate('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              currentView === 'create'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>➕</span>
            <span className="font-medium">创建应用</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            OpenClaw App Builder v0.1.0
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
