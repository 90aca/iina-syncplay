import type { ServerWebSocket } from "bun";

export type Client = { id: string; code: string };

export type SyncAction = "play" | "pause" | "seek" | "sync";

export type Message = {
  type: "sync";
  payload: {
    action: SyncAction;
    time: number;
    url: string;
  };
};

export type State = {
  url: string | null;
  time: number;
  paused: boolean;
};

export type Room = {
  code: string;
  state: State;
  clients: ServerWebSocket<Client>[];
  hostId: string | null;
};
