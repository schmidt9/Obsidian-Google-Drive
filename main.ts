import { checkConnection, getDriveClient } from "helpers/drive";
import { refreshAccessToken } from "helpers/ky";
import { pull } from "helpers/pull";
import { push } from "helpers/push";
import { reset } from "helpers/reset";
import { showNotice } from "helpers/notice";
import { ConsoleLogger, log, logError, LogSettings } from "helpers/logger";
import {
	App,
	debounce,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	Menu,
} from "obsidian";

interface PluginSettings {
	refreshToken: string;
	operations: Record<string, "create" | "delete" | "modify">;
	driveIdToPath: Record<string, string>;
	lastSyncedAt: number;
	changesToken: string;
	logSettings: LogSettings;
}

const DEFAULT_SETTINGS: PluginSettings = {
	refreshToken: "",
	operations: {},
	driveIdToPath: {},
	lastSyncedAt: 0,
	changesToken: "",
	logSettings: {
		enabled: true,
		addTimestamps: true,
		addPluginName: false,
	},
};

export default class ObsidianGoogleDrive extends Plugin {

	// set batch size limits to avoid request timeout error for large files sent in batches
	MAX_BATCH_SIZE = 10;
	MAX_BATCH_BYTES = 50 * 1024 * 1024; // 50 MB per concurrent batch

	settings: PluginSettings;
	accessToken = {
		token: "",
		expiresAt: 0,
	};
	drive = getDriveClient(this);
	ribbonIcon: HTMLElement;
	syncing: boolean;
	private writeQueue: Promise<void> = Promise.resolve();

	async onload() {
		const { vault } = this.app;

		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		ConsoleLogger.init(this.settings.logSettings);

		if (!this.settings.refreshToken) {
			showNotice(
				"Please add your refresh token to Google Drive Sync through our website or our readme/this plugin's settings. If you haven't already, PLEASE read through this plugin's readme or website CAREFULLY for instructions on how to use this plugin. If you don't know what you're doing, your data could get DELETED."
			);
			return;
		}

		this.ribbonIcon = this.addRibbonIcon(
			"refresh-cw",
			"Obsidian Google Drive",
			(event) => {
				if (this.syncing) return;
				const menu = new Menu();

				menu.addItem((item) =>
					item
						.setTitle("Pull from Drive")
						.setIcon("cloud-download")
						.onClick(() => {
							pull(this);
						})
				);

				menu.addItem((item) =>
					item
						.setTitle("Push to Drive")
						.setIcon("cloud-upload")
						.onClick(() => {
							push(this);
						})
				);
				menu.addItem((item) =>
					item
						.setTitle("Reset from Drive")
						.setIcon("triangle-alert")
						.onClick(() => {
							reset(this);
						})
				);
				menu.showAtMouseEvent(event);
			}
		);

		this.addCommand({
			id: "push",
			name: "Push to Google Drive",
			callback: () => push(this),
		});

		this.addCommand({
			id: "pull",
			name: "Pull from Google Drive",
			callback: () => pull(this),
		});

		this.addCommand({
			id: "reset",
			name: "Reset local vault to Google Drive",
			callback: () => reset(this),
		});

		this.app.workspace.onLayoutReady(() =>
			this.registerEvent(vault.on("create", this.handleCreate.bind(this)))
		);
		this.registerEvent(vault.on("delete", this.handleDelete.bind(this)));
		this.registerEvent(vault.on("modify", this.handleModify.bind(this)));
		this.registerEvent(vault.on("rename", this.handleRename.bind(this)));

		checkConnection().then(async (connected) => {
			if (connected) {
				this.syncing = true;
				this.ribbonIcon.addClass("spin");
				await pull(this, true);
				await this.endSync();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	/**
	 * Atomically save settings to prevent data.json corruption.
	 * Uses a write queue to serialize concurrent writes.
	 * Writes to adapter directly for better control over file operations.
	 */
	async saveSettings() {
		this.writeQueue = this.writeQueue.then(async () => {
			try {
				const dataStr = JSON.stringify(this.settings, null, 2);
				const pluginDataDir = `${this.manifest.dir}`;
				const dataPath = `${pluginDataDir}/data.json`;

				// Write directly to data.json via adapter
				// The adapter handles OS-level I/O which is more reliable for atomic operations
				await this.app.vault.adapter.write(dataPath, dataStr);
			} catch (err) {
				logError("Failed to save settings:", err);
			}
		});
		return this.writeQueue;
	}

	debouncedSaveSettings = debounce(this.saveSettings.bind(this), 500, true);

	handleCreate(file: TAbstractFile) {
		if (this.settings.operations[file.path] === "delete") {
			if (file instanceof TFile) {
				this.settings.operations[file.path] = "modify";
			} else {
				delete this.settings.operations[file.path];
			}
		} else {
			this.settings.operations[file.path] = "create";
		}
		this.debouncedSaveSettings();
	}

	handleDelete(file: TAbstractFile) {
		if (this.settings.operations[file.path] === "create") {
			delete this.settings.operations[file.path];
		} else {
			this.settings.operations[file.path] = "delete";
		}
		this.debouncedSaveSettings();
	}

	handleModify(file: TFile) {
		const operation = this.settings.operations[file.path];
		if (operation === "create" || operation === "modify") {
			return;
		}
		this.settings.operations[file.path] = "modify";
		this.debouncedSaveSettings();
	}

	handleRename(file: TAbstractFile, oldPath: string) {
		this.handleDelete({ ...file, path: oldPath });
		this.handleCreate(file);
		this.debouncedSaveSettings();
	}

	async createFolder(path: string) {
		const oldOperation = this.settings.operations[path];
		await this.app.vault.createFolder(path);
		this.settings.operations[path] = oldOperation;
		if (!oldOperation) delete this.settings.operations[path];
	}

	async createFile(
		path: string,
		content: ArrayBuffer,
		modificationDate?: number | string | Date
	) {
		const oldOperation = this.settings.operations[path];
		if (typeof modificationDate === "string") {
			modificationDate = new Date(modificationDate);
		}
		if (modificationDate instanceof Date) {
			modificationDate = modificationDate.getTime();
		}

		await this.app.vault.createBinary(path, content, {
			mtime: modificationDate,
		});
		this.settings.operations[path] = oldOperation;
		if (!oldOperation) delete this.settings.operations[path];
	}

	async modifyFile(
		file: TFile,
		content: ArrayBuffer,
		modificationDate?: number | string | Date
	) {
		const oldOperation = this.settings.operations[file.path];
		if (typeof modificationDate === "string") {
			modificationDate = new Date(modificationDate);
		}
		if (modificationDate instanceof Date) {
			modificationDate = modificationDate.getTime();
		}

		await this.app.vault.modifyBinary(file, content, {
			mtime: modificationDate,
		});
		this.settings.operations[file.path] = oldOperation;
		if (!oldOperation) delete this.settings.operations[file.path];
	}

	async upsertFile(
		file: string,
		content: ArrayBuffer,
		modificationDate?: number | string | Date
	) {
		const oldOperation = this.settings.operations[file];
		if (typeof modificationDate === "string") {
			modificationDate = new Date(modificationDate);
		}
		if (modificationDate instanceof Date) {
			modificationDate = modificationDate.getTime();
		}

		await this.app.vault.adapter.writeBinary(file, content, {
			mtime: modificationDate,
		});
		this.settings.operations[file] = oldOperation;
		if (!oldOperation) delete this.settings.operations[file];
	}

	async deleteFile(file: TAbstractFile) {
		const oldOperation = this.settings.operations[file.path];
		await this.app.fileManager.trashFile(file);
		delete this.settings.operations[file.path];
		if (!oldOperation) delete this.settings.operations[file.path];
	}

	async startSync() {
		log(this.startSync.name);

		if (!(await checkConnection())) {
			throw showNotice(
				"You are not connected to the internet, so you cannot sync right now. Please try syncing once you have connection again."
			);
		}
		this.ribbonIcon.addClass("spin");
		this.syncing = true;
		return showNotice("Syncing (0%)");
	}

	async endSync(syncNotice?: Notice, retainConfigChanges = true) {
		log(this.endSync.name);

		if (retainConfigChanges) {
			const configFilesToSync = await this.drive.getConfigFilesToSync();

			this.settings.lastSyncedAt = Date.now();

			await Promise.all(
				configFilesToSync.map(async (file) =>
					this.app.vault.adapter.writeBinary(
						file,
						await this.app.vault.adapter.readBinary(file),
						{ mtime: Date.now() }
					)
				)
			);
		} else {
			this.settings.lastSyncedAt = Date.now();
		}

		const changesToken = await this.drive.getChangesStartToken();
		if (!changesToken) {
			return showNotice(
				"An error occurred fetching Google Drive changes token."
			);
		}
		this.settings.changesToken = changesToken;
		await this.saveSettings();

		this.stopSync(syncNotice);
	}
	
	stopSync(syncNotice?: Notice, hideNotice: boolean = true) {
		log(this.stopSync.name);

		this.ribbonIcon.removeClass("spin");
		this.syncing = false;

		if (hideNotice) {
			syncNotice?.hide();
		}
	}
}

class SettingsTab extends PluginSettingTab {
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
				"A refresh token is required to access your Google Drive for syncing. We suggest cloning your Google Drive vault to the current vault BEFORE syncing."
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
								0
							);
							return await cancel();
						}

						const changesToken =
							await this.plugin.drive.getChangesStartToken();
						if (!changesToken) {
							return showNotice(
								"An error occurred fetching Google Drive changes token."
							);
						}
						this.plugin.settings.changesToken = changesToken;

						await this.plugin.saveSettings();
						showNotice (
							"Refresh token saved! Reload Obsidian to activate sync."
						);
					});
			});
	}
}
