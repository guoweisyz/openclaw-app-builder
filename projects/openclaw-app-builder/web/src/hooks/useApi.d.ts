export interface App {
    id: string;
    name: string;
    description: string;
    trigger: {
        type: string;
        config?: Record<string, any>;
    };
    workflow: any[];
    status: string;
    createdAt: string;
}
export declare function useApps(): {
    apps: App[];
    loading: boolean;
    error: string | null;
    createApp: (description: string, name?: string) => Promise<any>;
    runApp: (appId: string) => Promise<any>;
    refresh: () => Promise<void>;
};
export declare function useIntent(): {
    parsedIntent: any;
    loading: boolean;
    parseIntent: (description: string) => Promise<any>;
};
//# sourceMappingURL=useApi.d.ts.map