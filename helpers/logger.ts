export interface LogSettings {
    enabled: boolean;
    addTimestamps: boolean;
    /**
     * May be useful for distinguishing logs from different plugins in the console, 
     * especially when logging is enabled for multiple plugins or logger plugins are used
     * (like Logstravaganza)
     */
    addPluginName: boolean;
}

interface Logger {
    log(message: string, ...args: any[]): void;
}

export class ConsoleLogger implements Logger {

    settings: LogSettings;

    static instance: ConsoleLogger | undefined;

    public static init(logSettings: LogSettings) {
        ConsoleLogger.instance = new ConsoleLogger(logSettings);
    }

    constructor(logSettings: LogSettings) {
        this.settings = logSettings;
    }

    log(message: string, ...args: any[]): void {
        if (this.settings.enabled) {
            console.log(message, ...args);
        }
    }

    logError(message: string, ...args: any[]): void {
        if (this.settings.enabled) {
            console.error(message, ...args);
        }
    }
}

export const log = (message: string, ...args: any[]) => {
    message = formatMessage(message);
    ConsoleLogger.instance?.log(message, ...args);
}

export const logError = (message: string, ...args: any[]) => {
    message = formatMessage(message);
    ConsoleLogger.instance?.logError(message, ...args);
}

const formatMessage = (message: string) => {
    if (ConsoleLogger.instance?.settings.addPluginName) {
        message = `[Google Drive Sync] ${message}`;
    }

    if (ConsoleLogger.instance?.settings.addTimestamps) {
        const timestamp = new Date().toLocaleString();
        message = `[${timestamp}] ${message}`;
    }

    return message;
}