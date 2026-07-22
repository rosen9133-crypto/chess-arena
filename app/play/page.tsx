"use client";

import { useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import CapturedPieces from "@/components/CapturedPieces";
import GameControls from "@/components/GameControls";
import GameInfo from "@/components/GameInfo";
import { MoveHistory } from "@/components/MoveHistory";

type BoardOrientation = "white" | "black";

type ChessMove = {
  from: string;
  to: string;
  promotion?: string;
};

type PieceType = "p" | "n" | "b" | "r" | "q";

const whitePieceSymbols: Record<PieceType, string> = {
  p: "♙",
  n: "♘",
  b: "♗",
  r: "♖",
  q: "♕",
};

const blackPieceSymbols: Record<PieceType, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
};

const pieceOrder: Record<PieceType, number> = {
  p: 1,
  n: 2,
  b: 3,
  r: 4,
  q: 5,
};

export default function PlayPage() {
  const [game, setGame] = useState(() => new Chess());

  const [boardOrientation, setBoardOrientation] =
    useState<BoardOrientation>("white");

  function createGameWithHistory(movesToKeep?: number) {
    const newGame = new Chess();
    const completeHistory = game.history({ verbose: true });

    const historyToReplay =
      typeof movesToKeep === "number"
        ? completeHistory.slice(0, movesToKeep)
        : completeHistory;

    historyToReplay.forEach((move) => {
      newGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
    });

    return newGame;
  }

  function makeMove(move: ChessMove) {
    const gameCopy = createGameWithHistory();

    try {
      const result = gameCopy.move(move);

      setGame(gameCopy);

      return result;
    } catch {
      return null;
    }
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (game.isGameOver()) {
      return false;
    }

    return (
      makeMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      }) !== null
    );
  }

  function handleNewGame() {
    setGame(new Chess());
    setBoardOrientation("white");
  }

  function handleUndo() {
    const currentHistory = game.history({ verbose: true });

    if (currentHistory.length === 0) {
      return;
    }

    const gameWithoutLastMove = createGameWithHistory(
      currentHistory.length - 1,
    );

    setGame(gameWithoutLastMove);
  }

  function handleFlipBoard() {
    setBoardOrientation((currentOrientation) =>
      currentOrientation === "white" ? "black" : "white",
    );
  }

  function getCapturedPieces() {
    const whiteCaptures: PieceType[] = [];
    const blackCaptures: PieceType[] = [];

    const verboseHistory = game.history({ verbose: true });

    verboseHistory.forEach((move) => {
      if (!move.captured) {
        return;
      }

      const capturedPiece = move.captured as PieceType;

      if (move.color === "w") {
        whiteCaptures.push(capturedPiece);
      } else {
        blackCaptures.push(capturedPiece);
      }
    });

    whiteCaptures.sort(
      (firstPiece, secondPiece) =>
        pieceOrder[firstPiece] - pieceOrder[secondPiece],
    );

    blackCaptures.sort(
      (firstPiece, secondPiece) =>
        pieceOrder[firstPiece] - pieceOrder[secondPiece],
    );

    return {
      whiteCaptured: whiteCaptures.map(
        (piece) => blackPieceSymbols[piece],
      ),

      blackCaptured: blackCaptures.map(
        (piece) => whitePieceSymbols[piece],
      ),
    };
  }

  function getLastMoveSquareStyles() {
    const history = game.history({ verbose: true });
    const lastMove = history.at(-1);

    if (!lastMove) {
      return {};
    }

    const highlightedSquareStyle: CSSProperties = {
      background:
        "radial-gradient(circle, rgba(250, 204, 21, 0.72) 0%, rgba(234, 179, 8, 0.48) 100%)",

      boxShadow:
        "inset 0 0 0 4px rgba(253, 224, 71, 0.62)",
    };

    return {
      [lastMove.from as Square]: highlightedSquareStyle,
      [lastMove.to as Square]: highlightedSquareStyle,
    };
  }

  const isFlipped = boardOrientation === "black";
  const canUndo = game.history().length > 0;

  const { whiteCaptured, blackCaptured } =
    getCapturedPieces();

  const lastMoveSquareStyles =
    getLastMoveSquareStyles();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-[1450px]">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-yellow-400 sm:text-5xl">
            ♟️ Chess Arena
          </h1>

          <p className="mt-3 text-slate-400">
            Играй, развивай уменията си и покори арената.
          </p>
        </header>

        <div className="grid items-start gap-8 xl:grid-cols-[288px_minmax(0,620px)_288px] xl:justify-center">
          <aside className="flex w-full flex-col gap-6">
            <MoveHistory history={game.history()} />

            <GameControls
              canUndo={canUndo}
              isFlipped={isFlipped}
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onFlipBoard={handleFlipBoard}
            />
          </aside>

          <section className="w-full">
            <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl shadow-black/30">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={boardOrientation}
                customSquareStyles={lastMoveSquareStyles}
              />
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-[620px] items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Играч с белите
                </p>

                <p className="font-semibold text-white">
                  ⚪ Rosen
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Ход
                </p>

                <p className="font-bold text-yellow-400">
                  {game.moveNumber()}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Играч с черните
                </p>

                <p className="font-semibold text-white">
                  ⚫ Opponent
                </p>
              </div>
            </div>
          </section>

          <aside className="flex w-full flex-col gap-6">
            <GameInfo game={game} />

            <CapturedPieces
              whiteCaptured={whiteCaptured}
              blackCaptured={blackCaptured}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}