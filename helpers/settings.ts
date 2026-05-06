import { refreshAccessToken } from "./ky";
import { App, PluginSettingTab, Setting } from "obsidian";
import ObsidianGoogleDrive from "../main";
import { ConsoleLogger, FileLogger } from "./logger";
import { showNotice } from "./notice";

export class SettingsTab extends PluginSettingTab {
	plugin: ObsidianGoogleDrive;

	constructor(app: App, plugin: ObsidianGoogleDrive) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const { vault } = this.app;

		containerEl.empty();

		containerEl.createEl("a", {
			href: "https://ogd.richardxiong.com",
			text: "Get refresh token",
		});

		new Setting(containerEl)
			.setName("Refresh token")
			.setDesc(
				"A refresh token is required to access your Google Drive for syncing. We suggest cloning your Google Drive vault to the current vault BEFORE syncing.",
			)
			.addText((text) => {
				const cancel = async () => {
					this.plugin.settings.refreshToken = "";
					text.setValue("");
					return await this.plugin.saveSettings();
				};

				text.setPlaceholder("Enter your refresh token")
					.setValue(this.plugin.settings.refreshToken)
					.onChange(async (value) => {
						this.plugin.settings.refreshToken = value;
						if (!value) {
							return this.plugin.debouncedSaveSettings();
						}
						if (!(await refreshAccessToken(this.plugin))) {
							text.setValue("");
							return;
						}
						if (
							vault
								.getAllLoadedFiles()
								.filter(({ path }) => path !== "/").length > 0
						) {
							showNotice(
								"Your current vault is not empty! If you want our plugin to handle the initial sync, you have to clear out the current vault. Check the readme or website for more details.",
								0,
							);
							return await cancel();
						}

						const changesToken =
							await this.plugin.drive.getChangesStartToken();
						if (!changesToken) {
							return showNotice(
								"An error occurred fetching Google Drive changes token.",
							);
						}
						this.plugin.settings.changesToken = changesToken;

						await this.plugin.saveSettings();
						showNotice(
							"Refresh token saved! Reload Obsidian to activate sync.",
						);
					});
			});

		new Setting(containerEl)
			.setName("Logging")
			.setHeading()
			.setDesc(
				"Configure logging options. Logs can be helpful for debugging sync issues.",
			);

		new Setting(containerEl)
			.setName("Log to console")
			.setDesc(
				"Log messages to the browser console. Useful for debugging.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.logSettings.logToConsole)
					.onChange(async (value) => {
						this.plugin.settings.logSettings.logToConsole = value;

						if (ConsoleLogger.instance) {
							ConsoleLogger.instance.options.enabled = value;
						}

						await this.plugin.saveSettings();
					}),
			);

		const logToFileDesc = new DocumentFragment();
		const sizeInMegabytes =
			this.plugin.MAX_LOG_FILE_SIZE_BYTES / (1024 * 1024);
		logToFileDesc.append(
			`Log messages to a file. File logs are stored in the plugin's '${this.plugin.LOGS_DIR_NAME}' folder.`,
			document.createElement("br"),
			`Max log size: ${sizeInMegabytes}MB. When the log file exceeds this size, it will be rotated and a new log file will be created.`,
			document.createElement("br"),
			`Max backup log files count: ${this.plugin.MAX_BACKUP_LOG_FILES}. When the max backup count is exceeded, the oldest backup log file will be deleted.`,
		);

		new Setting(containerEl)
			.setName("Log to file")
			.setDesc(logToFileDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.logSettings.logToFile)
					.onChange(async (value) => {
						this.plugin.settings.logSettings.logToFile = value;

						if (FileLogger.instance) {
							FileLogger.instance.options.enabled = value;
						}

						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Add timestamps")
			.setDesc(
				"Include timestamps in log messages. Can be helpful for debugging and understanding the sequence of events during sync.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.logSettings.addTimestamps)
					.onChange(async (value) => {
						this.plugin.settings.logSettings.addTimestamps = value;

						if (ConsoleLogger.instance) {
							ConsoleLogger.instance.options.addTimestamps =
								value;
						}

						if (FileLogger.instance) {
							FileLogger.instance.options.addTimestamps = value;
						}

						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Add plugin name prefix")
			.setDesc(
				"Include the plugin name as a prefix in log messages. \
				This can be helpful for distinguishing logs from different plugins in the console, \
				especially when logging is enabled for multiple plugins or logger plugins are used(like Logstravaganza).\
				Note that the plugin name is not included in file logs since each plugin has its own log file.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.logSettings.addPluginName)
					.onChange(async (value) => {
						this.plugin.settings.logSettings.addPluginName = value;

						if (ConsoleLogger.instance) {
							ConsoleLogger.instance.options.addPluginName =
								value;
						}

						await this.plugin.saveSettings();
					}),
			);
	}
}
