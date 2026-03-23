import React from 'react';
import { View } from '../App';
interface LayoutProps {
    children: React.ReactNode;
    currentView: View;
    onNavigate: (view: View) => void;
}
export declare function Layout({ children, currentView, onNavigate }: LayoutProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Layout.d.ts.map