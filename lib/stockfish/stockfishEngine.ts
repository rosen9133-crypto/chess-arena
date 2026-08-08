"use client";

type StockfishMessageHandler = (
  message: string,
) => void;

export class StockfishEngine {
  private worker: Worker | null = null;

  private messageHandlers =
    new Set<StockfishMessageHandler>();

  start() {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      "/stockfish/stockfish-18-lite-single.js",
    );

    this.worker.onmessage = (
      event: MessageEvent<string>,
    ) => {
      const message = String(event.data);

      for (const handler of this.messageHandlers) {
        handler(message);
      }
    };

    this.worker.onerror = (event) => {
      console.error(
        "Stockfish worker error:",
        event,
      );
    };
  }

  send(command: string) {
    if (!this.worker) {
      throw new Error(
        "Stockfish engine has not been started.",
      );
    }

    this.worker.postMessage(command);
  }

  subscribe(handler: StockfishMessageHandler) {
    this.messageHandlers.add(handler);

    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  stop() {
    if (!this.worker) {
      return;
    }

    this.worker.postMessage("quit");
    this.worker.terminate();
    this.worker = null;
    this.messageHandlers.clear();
  }
}