# clash-shamebot

A mini-bot for aggregating Clash of Clans missed war attack data from the discord bot [ClashPerk](https://github.com/clashperk/clashperk), using missed attack log messages posted in a discord text channel (from /setup clan-logs).


Sums up missed attacks/user and posts a text summary in a given discord channel in order to more accurately gauge which members often miss attacks.

Made for own use, mileage may vary based on your setup but feel free to use or modify it to fit your needs.

### Commands:
`/shame` - Posts all time data (based on entire text channel history)

### Cronjob:
Posts data from last 30 days on the first of each month at 10 AM.


### Example output:

```
🔔 Missed Attacks Summary - All Time:

‎Barbarian: 4 missed attacks
‎Archer: 4 missed attacks
‎Giant: 3 missed attacks
‎Goblin: 3 missed attacks
‎Wall Breaker: 3 missed attacks
‎Balloon: 2 missed attacks
‎Wizard: 2 missed attacks
```
