const { mpv, event, standaloneWindow, menu, core, preferences, console } = iina;

standaloneWindow.loadFile("window.html");
menu.addItem(menu.item("SyncPlay", () => standaloneWindow.open()));

let isRemoteAction = false;
let pendingSeekTime: number | null = null;
let pendingAction: string | null = null;
let connected = false;

// sendSync sends the current status periodically to the server. This
// simultaneously also acts as a ping to keep the connection open I guess
function sendSync(action: string) {
  if (!connected) return;
  const time = mpv.getNumber("time-pos");
  const url = mpv.getString("path");
  standaloneWindow.postMessage("websocket", {
    type: "sync",
    payload: { action, time, url },
  });
}

// periodical broadcast to stay in sync
setInterval(() => sendSync("sync"), 5000);

// play/pause
event.on("mpv.pause.changed", () => {
  if (isRemoteAction) return;
  const paused = mpv.getFlag("pause");
  sendSync(paused ? "pause" : "play");
});

// seeking
event.on("mpv.seek", () => {
  if (isRemoteAction) return;
  sendSync("seek");
});

// file loaded
event.on("iina.file-loaded", () => {
  if (isRemoteAction) {
    if (pendingSeekTime !== null) {
      seek(pendingSeekTime);
      pendingSeekTime = null;
    }
    if (pendingAction === "pause") {
      core.pause();
    } else if (pendingAction === "play" || pendingAction === "sync") {
      core.resume();
    }
    pendingAction = null;
    setTimeout(() => (isRemoteAction = false), 100);
    return;
  }
  sendSync("play");
});

standaloneWindow.onMessage(
  "websocket",
  (data: { type: string; payload: { action: string; time: number; url: string } }) => {
    isRemoteAction = true;

    const { action, time, url } = data.payload;
    const currentUrl = mpv.getString("path");

    if (url !== currentUrl && url != null) {
      pendingSeekTime = time;
      pendingAction = action;
      core.open(url);
      return;
    }

    switch (action) {
      case "play":
        seek(time);
        core.resume();
        break;
      case "pause":
        seek(time);
        core.pause();
        break;
      case "seek":
        seek(time);
        break;
      case "sync": {
        const currentTime = mpv.getNumber("time-pos");
        if (Math.abs(currentTime - time) > 1) seek(time);
        break;
      }
    }

    setTimeout(() => (isRemoteAction = false), 100);
  },
);

standaloneWindow.onMessage("connected", () => {
  core.osd("Connected");
  connected = true;
});

standaloneWindow.onMessage("disconnected", () => {
  core.osd("Disconnected");
  connected = false;
});

// giving the webview the serverUrl for connecting
standaloneWindow.onMessage("config", () => {
  console.log(preferences.get("url") + " is the server URL");

  standaloneWindow.postMessage("config", {
    url: preferences.get("url"),
  });
});

function seek(time: number) {
  mpv.command("seek", [String(time), "absolute+exact"]);
}
