# Server Status

**Check if any Minecraft server is online**: player count, who's playing, the MOTD in its real colors, version, and server icon. Works for Java and Bedrock.

**Use it here: https://hybridash.github.io/ServerStatus/**

## Features

- Java and Bedrock servers, with or without a port (`play.example.net`, `1.2.3.4:25565`)
- MOTD shown with real Minecraft colors and formatting, including hex colors and the flickering `§k` text
- Player count with a fill bar, plus player names and heads when the server shares them
- Version, server software, mods and plugins (when the server lists them)
- **Share links**: the URL updates as you search, like `?ip=hypixel.net`, so you can send a friend a link that checks the server when they open it
- **Save** servers you check a lot. They show up as buttons at the top (saved in your browser only)

## How it works

It's a static page with no server of its own. It asks the free [mcsrvstat.us](https://mcsrvstat.us) API, which pings the server and caches the answer for about 5 minutes. MOTDs are turned into page text safely, never inserted as HTML, so a server can't put code on the page.

## Running it locally

```
python3 -m http.server
```

Then open http://localhost:8000.

## Tests

```
node test/motd.test.js
```

GitHub Actions runs the tests and deploys to GitHub Pages on every push to `main`.
