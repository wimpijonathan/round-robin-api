export enum ServerStatus {
    AVAILABLE = 'AVAILABLE',
    UNAVAILABLE = 'UNAVAILABLE'
}

export interface Server {
    host: string;
    port: number;
    status: ServerStatus;

    healthyCount: number;
    errorCount: number;
    slowCount: number;
}