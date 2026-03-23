import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { AppList } from './pages/AppList';
import { CreateApp } from './pages/CreateApp';
import { AppDetail } from './pages/AppDetail';
function App() {
    const [currentView, setCurrentView] = useState('list');
    const [selectedAppId, setSelectedAppId] = useState(null);
    const navigateTo = (view, appId) => {
        setCurrentView(view);
        if (appId)
            setSelectedAppId(appId);
    };
    return (_jsxs(Layout, { currentView: currentView, onNavigate: navigateTo, children: [currentView === 'list' && _jsx(AppList, { onNavigate: navigateTo }), currentView === 'create' && _jsx(CreateApp, { onNavigate: navigateTo }), currentView === 'detail' && selectedAppId && (_jsx(AppDetail, { appId: selectedAppId, onNavigate: navigateTo }))] }));
}
export default App;
//# sourceMappingURL=App.js.map