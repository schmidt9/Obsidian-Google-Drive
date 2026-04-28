interface Logger {
    log(message: string, ...args: any[]): void;
}

export class ConsoleLogger implements Logger {

    private loggingEnabled: boolean;

    static instance: ConsoleLogger | undefined;

    public static init(loggingEnabled: boolean) {
        ConsoleLogger.instance = new ConsoleLogger(loggingEnabled);
    }

    constructor(loggingEnabled: boolean) {
        this.loggingEnabled = loggingEnabled;
    }

    log(message: string, ...args: any[]): void {
        if (this.loggingEnabled) {
            console.log(message, ...args);
        }
    }
}

export const log = (message: string, ...args: any[]) => {
    const timestamp = new Date().toLocaleString();
    message = `[${timestamp}] ${message}`;
    ConsoleLogger.instance?.log(message, ...args);
}