import React, { useState } from 'react'
import { Layout } from './components/Layout'
import { AppList } from './pages/AppList'
import { CreateApp } from './pages/CreateApp'
import { AppDetail } from './pages/AppDetail'

export type View = 'list' | 'create' | 'detail'

function App() {
  const [currentView, setCurrentView] = useState<View>('list')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  const navigateTo = (view: View, appId?: string) => {
    setCurrentView(view)
    if (appId) setSelectedAppId(appId)
  }

  return (
    <Layout currentView={currentView} onNavigate={navigateTo}>
      {currentView === 'list' && <AppList onNavigate={navigateTo} />}
      {currentView === 'create' && <CreateApp onNavigate={navigateTo} />}
      {currentView === 'detail' && selectedAppId && (
        <AppDetail appId={selectedAppId} onNavigate={navigateTo} />
      )}
    </Layout>
  )
}

export default App
