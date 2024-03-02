import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface MyPluginSettings {
	telegramToken: string,
	telegramChatId: string;
	fileScheduleProperty: string,
	fileSchedulePrefix: string,
	notifyTime: string,
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	telegramToken: '',
	telegramChatId: '',
	fileScheduleProperty: 'scheduled',
	fileSchedulePrefix: '📅',
	notifyTime: '6:00',
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	filesToNotify: FileData[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));

		let pluginIsConfigured: boolean = Boolean(
			this.settings.telegramToken
				&& this.settings.telegramChatId
				&& this.settings.fileScheduleProperty
				&& this.settings.fileSchedulePrefix);

		if (pluginIsConfigured) {
			this.init(this.settings.fileScheduleProperty, this.settings.fileSchedulePrefix);
		} else {
			new Notice('Please configure the plugin settings');
		}
	}

	private init(fileScheduleProperty: string, fileSchedulePrefix: string) {
		this.app.workspace.onLayoutReady(async () => {
			this.setIntervalScan();
		});
	}

	private setIntervalScan() {
		let scanInProgress = true;

		this.scan().finally(() => {
			scanInProgress = false;
		});

		this.registerInterval(
			window.setInterval(() => {
				if (scanInProgress) {
					return;
				}
				scanInProgress = true;

				this.scan().finally(() => {
					scanInProgress = false;
				});
			}, 50000)
		);
	}

	private async scan(): Promise<void> {
		const {vault} = this.app;

		this.filesToNotify = [];

		for (const file of vault.getMarkdownFiles()) {
			let fileName = file.basename;
			let notifyDates: Date[] = [];

			let content = await vault.cachedRead(file);

			let notifyDate: Date|null = null;
			let pluginData = await this.loadData();

			notifyDate = this.getDateFromFileProperties(content);
			if (notifyDate)
				notifyDates.push(notifyDate);

			notifyDates.push(...this.getDatesFromFileBody(content));

			if (notifyDates.length !== 0) {
				let newNotifyDates: Date[] = [];

				for (notifyDate of notifyDates) {
					if (!this.isDateNotificationSent(fileName, notifyDate, pluginData))
						newNotifyDates.push(notifyDate);
				}

				this.filesToNotify.push({fileName, notifyDates: newNotifyDates});
			}
		}

		await this.sendNotifications();
	}

	private getDatesFromFileBody(content: string): Date[] {
		let notifyDates: Date[] = [];
		let lastOccurrence = -1;

		while (true) {
			lastOccurrence = content.indexOf(this.settings.fileSchedulePrefix, lastOccurrence + 1);
			if (lastOccurrence == undefined || lastOccurrence === -1)
				break;

			let lastOccurrenceWithoutPrefix = lastOccurrence + this.settings.fileSchedulePrefix.length;
			lastOccurrenceWithoutPrefix +=
				content.slice(lastOccurrenceWithoutPrefix).length -
				content.slice(lastOccurrenceWithoutPrefix).trimStart().length;

			let spaceOccurrence = content.slice(lastOccurrenceWithoutPrefix).search(/[ \n]/)
				+ lastOccurrenceWithoutPrefix;

			if (spaceOccurrence === -1)
				continue;

			let notifyDateContent = content.substring(lastOccurrenceWithoutPrefix, spaceOccurrence).trim();

			let date = this.getDateFromContent(notifyDateContent);
			if (date)
				notifyDates.push(date);
		}

		return notifyDates;
	}

	private async sendNotifications() {
		for (const file of this.filesToNotify) {
			for (let date of file.notifyDates) {
				date = new Date(date.toDateString() + ` ${this.settings.notifyTime}`);
				let now = new Date();

				const diffTime = Math.abs(now.getTime() - date.getTime());
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				if (date > now || diffDays > 5) {
					continue;
				}

				let pluginData = await this.loadData();

				if (pluginData[file.fileName] && pluginData[file.fileName][date.getTime()])
					continue;

				let message = `>📅 You have a task due on _${date.toDateString()}_\n👉 \`${file.fileName}\``;

				this.sendMessageToBot(
					this.settings.telegramToken,
					this.settings.telegramChatId,
					encodeURIComponent(message)
				);

				if (!pluginData[file.fileName])
					pluginData[file.fileName] = {};

				pluginData[file.fileName][date.getTime()] = true;

				await this.saveData(pluginData);
			}
		}
	}

	private getDateFromContent(notifyDateContent: string): Date|null {
		let notifyDate = new Date(notifyDateContent);

		if (notifyDate.toString() === "Invalid Date" || isNaN(notifyDate.getDate()))
			return null;

		return notifyDate;
	}

	private isDateNotificationSent(fileName: string, notifyDate: Date, pluginData: any): boolean {
		return pluginData[fileName] && pluginData[fileName][notifyDate.getTime()];
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private sendMessageToBot(botToken: string, chatId: string, message: string): void {
		fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=MarkdownV2`);
	}

	private getDateFromFileProperties(content: string): Date|null {
		if (content.substring(0, 3) !== '---')
			return null;

		let propertiesContent = content.substring(3, content.indexOf('---', 2));
		let scheduledProperty =
			propertiesContent.split(`${this.settings.fileScheduleProperty}:`)[1] ?? null;

		if (!scheduledProperty)
			return null;

		scheduledProperty = scheduledProperty.trim().split(/([ \n])/)[0];

		return this.getDateFromContent(scheduledProperty);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Telegram Bot Token')
			.setDesc('')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.telegramToken)
				.onChange(async (value) => {
					this.plugin.settings.telegramToken = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Telegram Chat ID')
			.setDesc('')
			.addText(text => text
				.setPlaceholder('Enter your chat id')
				.setValue(this.plugin.settings.telegramChatId)
				.onChange(async (value) => {
					this.plugin.settings.telegramChatId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Schedule Property Name')
			.setDesc('')
			.addText(text => text
				.setPlaceholder('Enter property name')
				.setValue(this.plugin.settings.fileScheduleProperty)
				.onChange(async (value) => {
					this.plugin.settings.fileScheduleProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Schedule Inline Prefix')
			.setDesc('')
			.addText(text => text
				.setPlaceholder('Enter inline prefix')
				.setValue(this.plugin.settings.fileSchedulePrefix)
				.onChange(async (value) => {
					this.plugin.settings.fileSchedulePrefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Notify Time')
			.setDesc('Time for dates without time')
			.addText(text => text
				.setPlaceholder('Enter time')
				.setValue(this.plugin.settings.notifyTime)
				.onChange(async (value) => {
					this.plugin.settings.notifyTime = value;
					await this.plugin.saveSettings();
				}));
	}
}

interface FileData {
	fileName: string;
	notifyDates: Date[];
}
