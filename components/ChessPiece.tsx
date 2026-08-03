type ChessPieceProps = {
  piece: string;
  size?: number;
};

const pieceMap: Record<string, string> = {
  "♙": "/pieces/w_pawn_svg_NoShadow.svg",
  "♘": "/pieces/w_knight_svg_NoShadow.svg",
  "♗": "/pieces/w_bishop_svg_NoShadow.svg",
  "♖": "/pieces/w_rook_svg_NoShadow.svg",
  "♕": "/pieces/w_queen_svg_NoShadow.svg",

  "♟": "/pieces/b_pawn_svg_NoShadow.svg",
  "♞": "/pieces/b_knight_svg_NoShadow.svg",
  "♝": "/pieces/b_bishop_svg_NoShadow.svg",
  "♜": "/pieces/b_rook_svg_NoShadow.svg",
  "♛": "/pieces/b_queen_svg_NoShadow.svg",
};

export default function ChessPiece({
  piece,
  size = 34,
}: ChessPieceProps) {
  const src = pieceMap[piece];

  if (!src) {
    return <span>{piece}</span>;
  }

  return (
    <img
      src={src}
      alt={piece}
      width={size}
      height={size}
      draggable={false}
    />
  );
}