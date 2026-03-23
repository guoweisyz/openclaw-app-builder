import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { View } from '../App';
export function Layout({ children, currentView, onNavigate }) {
    return (_jsxs("div", { className: "min-h-screen flex", children: [_jsxs("aside", { className: "w-64 bg-white border-r border-gray-200 flex flex-col", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsx("h1", { className: "text-xl font-bold text-primary-600", children: "\uD83D\uDE80 App Builder" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "\u8BA9\u4EA7\u54C1\u7ECF\u7406\u6784\u5EFAAI\u5E94\u7528" })] }), _jsxs("nav", { className: "flex-1 p-4 space-y-2", children: [_jsxs("button", { onClick: () => onNavigate('list'), className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'list'
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx("span", { children: "\uD83D\uDCF1" }), _jsx("span", { className: "font-medium", children: "\u6211\u7684\u5E94\u7528" })] }), _jsxs("button", { onClick: () => onNavigate('create'), className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'create'
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx("span", { children: "\u2795" }), _jsx("span", { className: "font-medium", children: "\u521B\u5EFA\u5E94\u7528" })] })] }), _jsx("div", { className: "p-4 border-t border-gray-200", children: _jsx("div", { className: "text-xs text-gray-400", children: "OpenClaw App Builder v0.1.0" }) })] }), _jsx("main", { className: "flex-1 overflow-auto", children: children })] }));
}
//# sourceMappingURL=Layout.js.map