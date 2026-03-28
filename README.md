# iina-syncplay

IINA plugin for synchronized playback across multiple players, perfect for
watching stuff together.

![](assets/showcase.mp4)

A free server is hosted at `iina-syncplay.90aca.com` and used by default. You
can self-host the server from `packages/server` for more privacy and change the
URL in the plugin preferences.

## Install

In IINA, go to Settings > Plugins > Browse, then enter `90aca/iina-syncplay`.
Alternatively, download the latest `SyncPlay.iinaplgz` from the [latest GitHub
release](https://github.com/90aca/iina-syncplay/releases/latest) and install
it.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
cd packages/plugin && bun run build
```

Link the plugin to IINA:

```sh
ln -s $(pwd)/packages/plugin/dist \
  ~/Library/Application\ Support/com.colliderli.iina/plugins/syncplay.iinaplugin-dev
```

After making changes, rebuild and restart IINA.
