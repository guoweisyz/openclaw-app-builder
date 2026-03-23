import { useState, useEffect } from 'react';
const API_BASE = 'http://localhost:3000/api';
export function useApps() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetchApps();
    }, []);
    const fetchApps = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/apps`);
            if (!response.ok)
                throw new Error('Failed to fetch apps');
            const data = await response.json();
            setApps(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    };
    const createApp = async (description, name) => {
        try {
            const response = await fetch(`${API_BASE}/intent/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, name }),
            });
            if (!response.ok)
                throw new Error('Failed to create app');
            const data = await response.json();
            // Save the generated app
            const saveResponse = await fetch(`${API_BASE}/apps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.app),
            });
            if (!saveResponse.ok)
                throw new Error('Failed to save app');
            await fetchApps();
            return data.app;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        }
    };
    const runApp = async (appId) => {
        try {
            const response = await fetch(`${API_BASE}/apps/${appId}/run`, {
                method: 'POST',
            });
            if (!response.ok)
                throw new Error('Failed to run app');
            return await response.json();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        }
    };
    return { apps, loading, error, createApp, runApp, refresh: fetchApps };
}
export function useIntent() {
    const [parsedIntent, setParsedIntent] = useState(null);
    const [loading, setLoading] = useState(false);
    const parseIntent = async (description) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/intent/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });
            if (!response.ok)
                throw new Error('Failed to parse intent');
            const data = await response.json();
            setParsedIntent(data);
            return data;
        }
        finally {
            setLoading(false);
        }
    };
    return { parsedIntent, loading, parseIntent };
}
//# sourceMappingURL=useApi.js.map