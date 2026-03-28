import "../index.css";
import { render } from "preact";
import { useState, useRef, useCallback } from "preact/hooks";

declare const iina: {
  onMessage: (name: string, callback: (data: any) => void) => void;
  postMessage: (name: string, data: any) => void;
};

let wsRef: WebSocket | null = null;
let serverUrl = "wss://iina-syncplay.90aca.com";

iina.onMessage("websocket", (data) => {
  if (wsRef?.readyState !== WebSocket.OPEN) return;
  wsRef.send(JSON.stringify(data));
});

// get server URL to connect to
iina.onMessage("config", (data) => {
  if (!data.url) return;
  serverUrl = data.url;
});
iina.postMessage("config", {});

// generateCode is on the client-side, but doesn't really matter
// security/privacy-wise, because we don't expose any personal information
// anyways. The most you can do is control another persons player and watch what
// they are watching...
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function App() {
  const [screen, setScreen] = useState<"lobby" | "room">("lobby");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const reconnectAttempt = useRef(0);
  const intentionalClose = useRef(false);
  const codeRef = useRef("");

  const connect = useCallback((roomCode: string) => {
    intentionalClose.current = false;
    codeRef.current = roomCode;
    setLoading(true);
    setError("");

    const ws = new WebSocket(`${serverUrl}?code=${roomCode}`);
    wsRef = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setLoading(false);
      iina.postMessage("connected", {});
      setScreen("room");
    };

    ws.onmessage = (event) => {
      iina.postMessage("websocket", JSON.parse(event.data));
    };

    ws.onclose = () => {
      wsRef = null;
      iina.postMessage("disconnected", {});

      if (intentionalClose.current) {
        setLoading(false);
        setScreen("lobby");
        return;
      }

      if (reconnectAttempt.current >= 3) {
        setLoading(false);
        setError("Connection lost. Could not reconnect.");
        setScreen("lobby");
        return;
      }

      reconnectAttempt.current++;
      setTimeout(() => connect(codeRef.current), 1000);
    };
  }, []);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    wsRef?.close();
    wsRef = null;
  }, []);

  if (screen !== "room") {
    return (
      <Lobby
        loading={loading}
        error={error}
        onCreate={() => {
          const c = generateCode();
          setCode(c);
          connect(c);
        }}
        onJoin={(c) => {
          setCode(c);
          connect(c);
        }}
      />
    );
  }

  return <Room code={code} onLeave={disconnect} />;
}

type LobbyProps = {
  loading: boolean;
  error: string;
  onCreate: () => void;
  onJoin: (code: string) => void;
};

function Lobby({ loading, error, onCreate, onJoin }: LobbyProps) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");

  function handleJoin() {
    if (!/^\d{6}$/.test(input)) {
      setInputError("Enter a valid 6-digit code");
      return;
    }
    setInputError("");
    onJoin(input);
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
      {error && <p class="text-xs text-red-500">{error}</p>}

      <button
        class="w-full max-w-xs px-4 py-2 bg-black text-white text-sm rounded-sm disabled:opacity-40"
        onClick={onCreate}
        disabled={loading}
      >
        Create room
      </button>

      <div class="w-full max-w-xs flex flex-col gap-1">
        <div class="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={input}
            onInput={(e) => {
              setInput((e.target as HTMLInputElement).value);
              setInputError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            class="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-sm outline-none focus:border-black"
            disabled={loading}
          />
          <button
            class="px-4 py-2 text-sm border border-neutral-300 rounded-sm hover:border-black disabled:opacity-40"
            onClick={handleJoin}
            disabled={loading}
          >
            Join
          </button>
        </div>
        {inputError && <p class="text-xs text-red-500">{inputError}</p>}
      </div>
    </div>
  );
}

type RoomProps = {
  code: string;
  onLeave: () => void;
};

function Room({ code, onLeave }: RoomProps) {
  return (
    <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p class="text-xs text-neutral-400 uppercase tracking-widest">Room</p>
      <p class="text-3xl font-mono font-bold tracking-widest">{code}</p>
      <button
        class="mt-2 px-4 py-2 text-sm border border-neutral-300 rounded-sm hover:border-black"
        onClick={onLeave}
      >
        Leave
      </button>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
