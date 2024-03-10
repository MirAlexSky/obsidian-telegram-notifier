import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface MyPluginSettings {
	telegramToken: string,
	telegramChatId: string;
	fileScheduleProperty: string,
	fileSchedulePrefix: string,
	notifyTime: string,
	notificationsSent: {
		[key: string]: {
			[key: string]: boolean
		}
	}
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	telegramToken: '',
	telegramChatId: '',
	fileScheduleProperty: 'scheduled',
	fileSchedulePrefix: '📅',
	notifyTime: '6:00',
	notificationsSent: {},
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	filesToNotify: FileData[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));

		const pluginIsConfigured = Boolean(
			this.settings.telegramToken
			&& this.settings.telegramChatId
			&& this.settings.fileScheduleProperty
			&& this.settings.fileSchedulePrefix);

		if (pluginIsConfigured) {
			this.init();
		} else {
			new Notice('Please, configure the plugin settings');
			console.log('Telegram Notifier: plugin isn\'t configured');
		}
	}

	private init() {
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
					console.log('Telegram Notifier: the scan is in progress too long!')
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
		await this.loadSettings();

		this.filesToNotify = [];

		for (const file of vault.getMarkdownFiles()) {

			if (new Date().getTime() - file.stat.mtime < 1000 * 60 * 2) {
				console.log('Note has just modified! ' + file.basename + ': ' + ((new Date().getTime() - file.stat.mtime)/1000) + ' sec ago');
				continue;
			}

			const fileName = file.basename;
			const notifyDates: Date[] = [];
			const content = await vault.cachedRead(file);

			let notifyDate: Date|null = null;

			notifyDate = this.getDateFromFileProperties(content);
			if (notifyDate)
				notifyDates.push(notifyDate);

			notifyDates.push(...this.getDatesFromFileBody(content));

			if (notifyDates.length === 0)
				continue;

			const newNotifyDates: Date[] = [];

			for (notifyDate of notifyDates) {
				if (this.isNotificationAllowedToSend(fileName, notifyDate)) {
					newNotifyDates.push(notifyDate);
				}
			}

			this.filesToNotify.push({
				fileName,
				isToSend: newNotifyDates.length > 0,
				notifyDates: newNotifyDates
			});
		}

		await this.sendNotificationsToBot();
	}

	private getDatesFromFileBody(content: string): Date[] {
		const notifyDates: Date[] = [];
		let lastOccurrence = -1;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			lastOccurrence = content.indexOf(this.settings.fileSchedulePrefix, lastOccurrence + 1);

			if (lastOccurrence == undefined || lastOccurrence === -1)
				break;

			let lastOccurrenceWithoutPrefix = lastOccurrence + this.settings.fileSchedulePrefix.length;
			lastOccurrenceWithoutPrefix +=
				content.slice(lastOccurrenceWithoutPrefix).length -
				content.slice(lastOccurrenceWithoutPrefix).trimStart().length;

			const endOfDateOccurrence = content.slice(lastOccurrenceWithoutPrefix).search(/[ \n]|$/m)
				+ lastOccurrenceWithoutPrefix;

			if (endOfDateOccurrence === -1)
				continue;

			const notifyDateContent = content.substring(lastOccurrenceWithoutPrefix, endOfDateOccurrence).trim();

			const date = this.getDateFromContent(notifyDateContent);
			if (date)
				notifyDates.push(date);
		}

		return notifyDates;
	}

	private async sendNotificationsToBot() {
		console.log('Telegram Notifier: prepare for sending notifications. Scheduled files found:');
		console.dir(this.filesToNotify);

		for (const file of this.filesToNotify) {
			for (const date of file.notifyDates) {
				this.sendNotificationToBot(date, file.fileName);
			}
		}
	}

	private async saveFileDateAsSent(fileName: string, notifyDate: Date) {
		if (!this.settings.notificationsSent[fileName])
			this.settings.notificationsSent[fileName] = {};

		this.settings.notificationsSent[fileName][notifyDate.getTime()] = true;

		await this.saveSettings();
	}

	private getDateFromContent(notifyDateContent: string): Date | null {
		const notifyDate = new Date(notifyDateContent);

		if (notifyDate.toString() === "Invalid Date" || isNaN(notifyDate.getDate()))
			return null;

		return notifyDate;
	}

	private isDateNotificationSent(fileName: string, notifyDate: Date): boolean {
		return Boolean(this.settings.notificationsSent[fileName]
			&& this.settings.notificationsSent[fileName][notifyDate.getTime()]);
	}

	private isNotificationAllowedToSend(fileName: string, date: Date) {
		const dateTime = new Date(date.toDateString() + ` ${this.settings.notifyTime}`);
		const now = new Date();

		const diffTime = Math.abs(now.getTime() - dateTime.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		const isNotToSend = (dateTime > now) || (diffDays > 5) || this.isDateNotificationSent(fileName, date);

		return !isNotToSend;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private sendNotificationToBot(date: Date, fileName: string) {
		const message = `>📅 You have a task due on _${date.toDateString()}_\n👉 \`${fileName}\``;

		this.sendMessageToBot(encodeURIComponent(message))
			.then(async (r) => {
				if (!r.ok)
					return;

				await this.saveFileDateAsSent(fileName, date);
			});
	}

	private sendMessageToBot(message: string): Promise<Response> {
		const botToken = this.settings.telegramToken;
		const chatId = this.settings.telegramChatId;

		const url =
			`https://api.telegram.org/bot${botToken}/sendMessage?
			chat_id=${chatId}&text=${message}
			&parse_mode=MarkdownV2`;

		return fetch(url)
			.then(async r => {
				console.log('Telegram Notifier: the message was sent to the bot. Request URI:');
				console.log(decodeURIComponent(url));
				console.dir({
					status: r.status,
					statusText: r.statusText,
					body: await r.json(),
				});

				return r;
			});
	}

	private getDateFromFileProperties(content: string): Date | null {
		if (content.substring(0, 3) !== '---')
			return null;

		const propertiesContent = content.substring(3, content.indexOf('---', 2));
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
			.setDesc('You need to create your own bot via @BotFather and get the token there.')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.telegramToken)
				.onChange(async (value) => {
					this.plugin.settings.telegramToken = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Telegram Chat ID')
			.setDesc('Chat ID can be obtained via telegram @getidsbot bot.')
			.addText(text => text
				.setPlaceholder('Enter your Chat ID')
				.setValue(this.plugin.settings.telegramChatId)
				.onChange(async (value) => {
					this.plugin.settings.telegramChatId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Schedule Property Name')
			.setDesc('The name of note property, which used to schedule notifications')
			.addText(text => text
				.setPlaceholder('Enter property name')
				.setValue(this.plugin.settings.fileScheduleProperty)
				.onChange(async (value) => {
					this.plugin.settings.fileScheduleProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Schedule Inline Prefix')
			.setDesc('The prefix followed by the a date is used to schedule notifications. ' +
				'For example, the following line in a note would cause the plugin to send a notification: "📅 2024-01-01"')
			.addText(text => text
				.setPlaceholder('Enter inline prefix')
				.setValue(this.plugin.settings.fileSchedulePrefix)
				.onChange(async (value) => {
					this.plugin.settings.fileSchedulePrefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Notify Time')
			.setDesc('Default time for dates with no time specified. For example, a "6:00" value will cause the plugin ' +
				'to send a notification not earlier before 6:00.')
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
	isToSend: boolean,
	notifyDates: Date[];
}
