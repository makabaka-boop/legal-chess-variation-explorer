/** 基础类型：颜色、棋子、走法、局面。棋盘用 64 格数组，0 = a1，63 = h8。 */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: Color;
  type: PieceType;
}

export interface Move {
  from: number;
  to: number;
  promotion?: PieceType;
}

/** 易位权位掩码 */
export const CASTLE = {
  K: 1, // 白短易位
  Q: 2, // 白长易位
  k: 4, // 黑短易位
  q: 8 // 黑长易位
} as const;

export interface Position {
  board: (Piece | null)[];
  turn: Color;
  castling: number;
  /** 过路兵目标格（兵刚走两格时其身后一格），无则为 null */
  ep: number | null;
  halfmove: number;
  fullmove: number;
}

export const opp = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}
