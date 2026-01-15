# clash-shamebot

A mini-bot for aggregating Clash of Clans missed war attack data from the discord bot [ClashPerk](https://github.com/clashperk/clashperk), using missed attack log messages posted in a discord text channel (from /setup clan-logs).


Sums up missed attacks/user and posts a text summary in a given discord channel in order to more accurately gauge which members often miss attacks.

Made for own use, mileage may vary based on your setup but feel free to use or modify it to fit your needs.

### Commands:
`/shame`

- **Time Period Options**: The `/shame` command requires a `period` option with choices:
  - `All Time` - Shows all missed attacks 
  - `Days` - Filter by number of days
  - `Weeks` - Filter by number of weeks  
  - `Months` - Filter by number of months
  - `Years` - Filter by number of years

- **Optional Number Parameter**: When selecting a time period (except "All Time"), users can specify how many periods to look back (e.g., `/shame period:days number:3` for last 3 days)

## Usage Examples

### View all missed attacks
`/shame period:alltime`

### View missed attacks from last 3 days
`/shame period:days number:3`

### View missed attacks from last 2 weeks  
`/shame period:weeks number:2`

### View missed attacks from last month
`/shame period:months number:1`

### Cronjob:
Posts data from last 30 days on the first of each month at 08 AM.


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

The output is posted in an embed.
