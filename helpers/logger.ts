import { App } from "obsidian";

export interface LogSettings {
	logToConsole: boolean;
	logToFile: boolean;
	addTimestamps: boolean;
	/**
	 * May be useful for distinguishing logs from different plugins in the console,
	 * especially when logging is enabled for multiple plugins or logger plugins are used
	 * (like Logstravaganza)
	 */
	addPluginName: boolean;
}

export interface LoggerOptions {
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
	log(message: string, ...args: any[]): void | Promise<void>;
	logError(message: string, ...args: any[]): void | Promise<void>;
}

export interface FileLoggerOptions extends LoggerOptions {
	app: App;
	/** Directory where log files will be written. */
	logDir: string;
	/** Maximum size in bytes before the current log is rotated. */
	maxBytes: number;
	/** Maximum number of rotated backups to keep. */
	maxBackups: number;
}

export class FileLogger implements Logger {
	options: FileLoggerOptions;

	private writeQueue: Promise<void> = Promise.resolve();

	static instance: FileLogger | undefined;

	public static init(options: FileLoggerOptions) {
		FileLogger.instance = new FileLogger(options);
	}

	constructor(options: FileLoggerOptions) {
		this.options = options;
	}

	async log(message: string, ...args: any[]): Promise<void> {
		this.writeQueue = this.writeQueue.then(() => this.writeLog(message));
		await this.writeQueue;
	}

	async logError(message: string, ...args: any[]): Promise<void> {
		await this.log(message, ...args);
	}

	private async writeLog(message: string): Promise<void> {
		const filePath = this.getCurrentLogPath();
		const entrySize = new TextEncoder().encode(message).length;

		const fileExists =
			await this.options.app.vault.adapter.exists(filePath);
		if (fileExists) {
			const stats = await this.options.app.vault.adapter.stat(filePath);
			if (
				stats?.size != null &&
				stats.size + entrySize > this.options.maxBytes
			) {
				await this.rotateLogs(filePath);
			}
		}

		await this.ensureLogDir();
		await this.options.app.vault.adapter.append(filePath, message);
	}

	private getCurrentLogPath(): string {
		const normalizedLogDir = this.options.logDir.replace(/\/+$/, "");
		return `${normalizedLogDir}/${this.formatDate(new Date())}.log`;
	}

	private async rotateLogs(filePath: string): Promise<void> {
		if (this.options.maxBackups <= 0) {
			try {
				await this.options.app.vault.adapter.remove(filePath);
			} catch {
				// ignore if it cannot be removed
			}
			return;
		}

		for (let index = this.options.maxBackups; index >= 1; index--) {
			const source = index === 1 ? filePath : `${filePath}.${index - 1}`;
			const target = `${filePath}.${index}`;

			if (!(await this.options.app.vault.adapter.exists(source))) {
				continue;
			}

			if (
				index === this.options.maxBackups &&
				(await this.options.app.vault.adapter.exists(target))
			) {
				await this.options.app.vault.adapter.remove(target);
			}

			await this.options.app.vault.adapter.rename(source, target);
		}
	}

	private async ensureLogDir(): Promise<void> {
		if (
			!(await this.options.app.vault.adapter.exists(this.options.logDir))
		) {
			await this.options.app.vault.createFolder(this.options.logDir);
		}
	}

	private formatDate = (date: Date): string =>
		date.toISOString().slice(0, 10);
}

export class ConsoleLogger implements Logger {
	options: LoggerOptions;

	static instance: ConsoleLogger | undefined;

	public static init(options: LoggerOptions) {
		ConsoleLogger.instance = new ConsoleLogger(options);
	}

	constructor(options: LoggerOptions) {
		this.options = options;
	}

	log(message: string, ...args: any[]): void {
		console.log(message, ...args);
	}

	logError(message: string, ...args: any[]): void {
		console.error(message, ...args);
	}
}

export const log = (message: string, ...args: any[]) => {
	const consoleLogger = ConsoleLogger.instance;
	const fileLogger = FileLogger.instance;

	if (consoleLogger?.options.enabled) {
		const text = formatMessage(
			message,
			consoleLogger.options.addPluginName,
			consoleLogger.options.addTimestamps,
			args,
		);
		consoleLogger.log(text);
	}

	if (fileLogger?.options.enabled) {
		const text = formatMessage(
			message,
			fileLogger.options.addPluginName,
			fileLogger.options.addTimestamps,
			args,
		);
		fileLogger.log(text + "\n");
	}
};

export const logError = (message: string, ...args: any[]) => {
	const consoleLogger = ConsoleLogger.instance;
	const fileLogger = FileLogger.instance;

	if (consoleLogger?.options.enabled) {
		const text = formatMessage(
			message,
			consoleLogger.options.addPluginName,
			consoleLogger.options.addTimestamps,
			args,
		);
		consoleLogger.logError(text);
	}

	if (fileLogger?.options.enabled) {
		const text = formatMessage(
			"[ERROR] " + message,
			fileLogger.options.addPluginName,
			fileLogger.options.addTimestamps,
			args,
		);
		fileLogger.logError(text + "\n");
	}
};

const formatArg = (arg: any): string => {
	if (typeof arg === "string") {
		return arg;
	}

	if (arg instanceof Error) {
		return arg.stack ?? arg.message;
	}

	try {
		return JSON.stringify(arg);
	} catch {
		return String(arg);
	}
};

const formatMessage = (
	message: string,
	addPluginName: boolean,
	addTimestamps: boolean,
	args: any[],
): string => {
	let text = [message, ...args.map(formatArg)].join(" ");

	if (addPluginName) {
		text = `[Google Drive Sync] ${text}`;
	}

	if (addTimestamps) {
		const timestamp = new Date().toLocaleString();
		text = `[${timestamp}] ${text}`;
	}

	return `${text}`;
};
