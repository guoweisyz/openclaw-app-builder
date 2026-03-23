import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { View } from '../App';
export function AppDetail({ appId, onNavigate }) {
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    useEffect(() => {
        fetchApp();
    }, [appId]);
    const fetchApp = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/apps/${appId}`);
            if (response.ok) {
                const data = await response.json();
                setApp(data);
            }
        }
        catch (err) {
            console.error('Failed to fetch app:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRun = async () => {
        try {
            setRunning(true);
            const response = await fetch(`http://localhost:3000/api/apps/${appId}/run`, {
                method: 'POST',
            });
            const result = await response.json();
            setLastResult(result);
        }
        catch (err) {
            alert('运行失败');
        }
        finally {
            setRunning(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "p-8", children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/4" }), _jsx("div", { className: "h-32 bg-gray-200 rounded" })] }) }));
    }
    if (!app) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 text-red-700", children: "\u5E94\u7528\u672A\u627E\u5230" }) }));
    }
    return (_jsxs("div", { className: "p-8", children: [_jsx("button", { onClick: () => onNavigate('list'), className: "text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1", children: "\u2190 \u8FD4\u56DE\u5217\u8868" }), _jsxs("div", { className: "flex justify-between items-start mb-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: app.name }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${app.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : app.status === 'draft'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'}`, children: app.status })] }), _jsx("p", { className: "text-gray-500 mt-1", children: app.description })] }), _jsx("button", { onClick: handleRun, disabled: running, className: "bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2", children: running ? '运行中...' : '▶️ 运行应用' })] }), _jsxs("div", { className: "grid grid-cols-3 gap-6", children: [_jsxs("div", { className: "col-span-2 space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u5DE5\u4F5C\u6D41" }), _jsx("div", { className: "space-y-4", children: app.workflow.map((step, index) => (_jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium", children: index + 1 }), _jsx("div", { className: "flex-1 bg-gray-50 rounded-lg p-4", children: _jsx("div", { className: "flex justify-between items-start", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: step.name }), _jsxs("p", { className: "text-sm text-gray-500", children: [step.componentId, " \u2192 ", step.action] })] }) }) })] }, step.id))) })] }), lastResult && (_jsxs("div", { className: `rounded-xl border p-6 ${lastResult.success
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'}`, children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: lastResult.success ? '✅ 执行成功' : '❌ 执行失败' }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("p", { children: [_jsx("span", { className: "text-gray-500", children: "\u8FD0\u884CID:" }), " ", lastResult.runId] }), _jsxs("p", { children: [_jsx("span", { className: "text-gray-500", children: "\u5F00\u59CB\u65F6\u95F4:" }), " ", new Date(lastResult.startedAt).toLocaleString()] }), _jsxs("p", { children: [_jsx("span", { className: "text-gray-500", children: "\u7ED3\u675F\u65F6\u95F4:" }), " ", new Date(lastResult.endedAt).toLocaleString()] }), lastResult.error && (_jsx("p", { className: "text-red-600", children: lastResult.error })), Object.keys(lastResult.outputs).length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-gray-500 mb-2", children: "\u8F93\u51FA:" }), _jsx("pre", { className: "bg-white rounded-lg p-3 text-xs overflow-auto", children: JSON.stringify(lastResult.outputs, null, 2) })] }))] })] }))] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "\u5E94\u7528ID" }), _jsx("p", { className: "font-mono text-gray-900", children: app.id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "\u89E6\u53D1\u65B9\u5F0F" }), _jsx("p", { className: "text-gray-900", children: app.trigger.type }), app.trigger.config?.cron && (_jsx("p", { className: "font-mono text-gray-600", children: app.trigger.config.cron }))] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("p", { className: "text-gray-900", children: new Date(app.createdAt).toLocaleString() })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl border border-gray-200 p-6", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-4", children: "\u7EDF\u8BA1" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-2xl font-bold text-primary-600", children: app.workflow.length }), _jsx("p", { className: "text-sm text-gray-500", children: "\u5DE5\u4F5C\u6D41\u6B65\u9AA4" })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-2xl font-bold text-green-600", children: "-" }), _jsx("p", { className: "text-sm text-gray-500", children: "\u6267\u884C\u6B21\u6570" })] })] })] })] })] })] }));
}
//# sourceMappingURL=AppDetail.js.map