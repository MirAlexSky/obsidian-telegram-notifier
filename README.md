# :warning: The plugin is green. Use at your own risk.

<img src="https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/telegram-obsidian.png" width="800" alt="Telegra + Obsidian">

# Telegram Notifier
[![License](http://poser.pugx.org/miralexsky/ozon-logistics-api/license)](https://packagist.org/packages/miralexsky/ozon-logistics-api)

### :white_check_mark: Plugin features
- [X] Sending notifications to the Telegram bot using the note property
- [X] Sending notifications to the Telegram bot using an inline template

![screen-telegram](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen3.png "Screen Telegram")

## Table of Contents
* [:rocket: Getting Started](#rocket-getting-started)
* [:bell: Sending Notifications](#bell-sending-notifications)
* [:bulb: Tips](#bulb-tips)

### :rocket: Getting Started

1. First, you need to create your own Telegram bot.
This process only takes about 3 minutes and can be done by writing to [@BotFather](https://t.me/BotFather).
Follow the instructions to create a new bot and set it up as desired.
If you need more information about creating your own Telegram Bot, you can find it on the telegram official website.

2. Next, obtain your `Bot Token` from the bot you've created. These values are required to configure the plugin.
You can get a `Bot Token` through @BotFather. 

3. Obtain your `Chat ID`, you can use the [@getidsbot](https://t.me/getidsbot) bot. 
Simply write to him and it will send you your `Chat ID`. It will look something like this:<br> 
`👤 You` <br>
   `├ id: 123456789` :point_left: _your `Chat ID`_
   * If the upper step didn't work, there is an alternative solution:
	 Go to https://api.telegram.org/bot{YourBotToken}/getUpdates,
	 and replace {YourBotToken} with your actual token.
	 You should see something like "chat":{"id":123456789, copy the "id" number (123456789) - this is your `Chat ID`.

4. Fill `Bot Token` and `Chat ID` in the plugin settings and add other information as you choose.
5. Reload plugin after configuring it. 
6. Done!

### :bell: Sending Notifications
To create scheduled notifications, simply add the _"scheduled"_
property to your file (or use your own if you've changed it in the settings). 
Also, you can add the date directly in the body of the file, preceded by 📅 (which can be changed in the settings as well).

Plugin scans for new notifications every 50 seconds.

![screen](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen2.png "Screen #2")
![screen](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen1.png "Screen #1")

### :bulb: Tips

The best way for me to use this plugin is by note properties as far as you
can simply pick a date via the user interface, using the Obsidian's built-in properties feature.

Otherwise, if you need to insert an inline date, the 
[Date Inserter plugin](https://github.com/namikaze-40p/obsidian-date-inserter)
would be convenient for you.

The Date Inserter plugin provides a user interface for inserting inline dates. 
To make your experience even better, you can configure it a little by copying 
your Schedule Inline Prefix of the Telegram Notifier plugin 
into the Date Format field of the Date Inserter plugin. 
This will allow you ability to insert the entire date template
within a single shortcut and simple user interface. 
Additionally, you can change the shortcut in the Date Inserter's settings.
