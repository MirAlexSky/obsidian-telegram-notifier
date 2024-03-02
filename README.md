<img src="https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/telegram-obsidian.png" width="800">

# Telegram Notifier
[![License](http://poser.pugx.org/miralexsky/ozon-logistics-api/license)](https://packagist.org/packages/miralexsky/ozon-logistics-api)

### :white_check_mark: Plugin features
- [X] Sending notifications to the Telegram bot using the note property
- [X] Sending notifications to the Telegram bot using an inline template

![screen-telegram](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen3.png "Screen Telegram")

<h2>:rocket:Getting started</h2>

First, you need to create your own Telegram bot.
This process only takes about 3 minutes and can be done by writing to @BotFather (https://t.me/BotFather).
Follow the instructions to create a new bot and set it up as desired.
If you need more information about creating your own Telegram Bot, you can find it on the telegram official website.

Next, obtain your Bot token and Chat ID from the bot you created. These values are required to configure the plugin.
You can get bot token via @BotFather. It's a little more complicated with Chat ID: 
Go to the link https://api.telegram.org/bot{YourBotToken}/getUpdates, but replace {YourBotToken} with your real token.
You will see something like "chat":{"id":261860914, copy id numbers "261860914" - it would be your chat id.

Fill these in the plugin settings and add other information as you choose.

After configuring the plugin, reload it and that's it!

To create scheduled notifications, simply add the "scheduled"
property to your file (or use your own if you've changed it in the settings). 
Also, you can add the data directly in the body of the file, preceded by 📅 (which can be changed in the settings as needed).

![screen](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen1.png "Screen #1")
![screen](https://github.com/MirAlexSky/obsidian-telegram-notifier/blob/master/images/screen2.png "Screen #2")
