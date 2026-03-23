import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { View } from '../App';
import { useApps } from '../hooks/useApi';
export function AppList({ onNavigate }) {
    const { apps, loading, error, runApp, refresh } = useApps();
    const handleRun = async (appId) => {
        try {
            const result = await runApp(appId);
            alert(result.success ? '运行成功！' : `运行失败: ${result.error}`);
        }
        catch (err) {
            alert('运行出错');
        }
    };
    if (loading) {
        return (_jsx("div", { className: "p-8", children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/4" }), _jsx("div", { className: "h-32 bg-gray-200 rounded" }), _jsx("div", { className: "h-32 bg-gray-200 rounded" })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "p-8", children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 text-red-700", children: [_jsx("p", { className: "font-medium", children: "\u52A0\u8F7D\u5931\u8D25" }), _jsx("p", { className: "text-sm mt-1", children: error }), _jsx("button", { onClick: refresh, className: "mt-3 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded", children: "\u91CD\u8BD5" })] }) }));
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "\u6211\u7684\u5E94\u7528" }), _jsx("p", { className: "text-gray-500 mt-1", children: "\u7BA1\u7406\u4F60\u7684 AI \u81EA\u52A8\u5316\u5E94\u7528" })] }), _jsxs("button", { onClick: () => onNavigate('create'), className: "bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2", children: [_jsx("span", { children: "\u2795" }), "\u521B\u5EFA\u5E94\u7528"] })] }), apps.length === 0 ? (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-12 text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDE80" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\u8FD8\u6CA1\u6709\u5E94\u7528" }), _jsx("p", { className: "text-gray-500 mb-6", children: "\u521B\u5EFA\u4F60\u7684\u7B2C\u4E00\u4E2A AI \u81EA\u52A8\u5316\u5E94\u7528" }), _jsx("button", { onClick: () => onNavigate('create'), className: "bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium", children: "\u7ACB\u5373\u521B\u5EFA" })] })) : (_jsx("div", { className: "grid gap-4", children: apps.map((app) => (_jsx("div", { className: "bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: app.name }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${app.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : app.status === 'draft'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'}`, children: app.status })] }), _jsx("p", { className: "text-gray-500 mt-1", children: app.description }), _jsxs("div", { className: "flex items-center gap-4 mt-3 text-sm text-gray-400", children: [_jsxs("span", { children: ["\u89E6\u53D1: ", app.trigger.type] }), _jsxs("span", { children: ["\u6B65\u9AA4: ", app.workflow.length] }), _jsxs("span", { children: ["\u521B\u5EFA\u4E8E: ", new Date(app.createdAt).toLocaleDateString()] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => handleRun(app.id), className: "bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg font-medium text-sm", children: "\u25B6\uFE0F \u8FD0\u884C" }), _jsx("button", { onClick: () => onNavigate('detail', app.id), className: "bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm", children: "\u8BE6\u60C5" })] })] }) }, app.id))) }))] }));
}
//# sourceMappingURL=AppList.js.map