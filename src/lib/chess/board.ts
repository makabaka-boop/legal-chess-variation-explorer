/** 格子坐标工具与 FEN 载入（FEN 仅用于引擎内部与测试，不做 PGN 解析）。 */

import { CASTLE, type Color, type Piece, type PieceType, type Position } from './types';

export const fileOf = (sq: number): number => sq & 7;
export const rankOf = (sq: number): number => sq >> 3;
export const makeSq = (file: number, rank: number): number => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

const FILES = 'abcdefgh';

export const sqName = (sq: number): string => FILES[fileOf(sq)] + String(rankOf(sq) + 1);

export function parseSq(name: string): number {
  const f = FILES.indexOf(name[0]);
  const r = name.charCodeAt(1) - 49; // '1' -> 0
  if (f < 0 || r < 0 || r > 7) throw new Error(`bad square: ${name}`);
  return makeSq(f, r);
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function initialPosition(): Position {
  return fromFen(START_FEN);
}

export function fromFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  const [placement, turn, castling, ep, half, full] = parts;
  const board: (Piece | null)[] = new Array(64).fill(null);
  const rows = placement.split('/');
  if (rows.length !== 8) throw new Error(`bad FEN placement: ${fen}`);
  for (let i = 0; i < 8; i++) {
    const rank = 7 - i; // FEN 从第 8 横排开始
    let file = 0;
    for (const ch of rows[i]) {
      if (ch >= '1' && ch <= '8') {
        file += ch.charCodeAt(0) - 48;
      } else {
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
        board[makeSq(file, rank)] = { color, type: ch.toLowerCase() as PieceType };
        file++;
      }
    }
    if (file !== 8) throw new Error(`bad FEN rank: ${rows[i]}`);
  }
  let castlingBits = 0;
  if (castling && castling !== '-') {
    if (castling.includes('K')) castlingBits |= CASTLE.K;
    if (castling.includes('Q')) castlingBits |= CASTLE.Q;
    if (castling.includes('k')) castlingBits |= CASTLE.k;
    if (castling.includes('q')) castlingBits |= CASTLE.q;
  }
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: castlingBits,
    ep: ep && ep !== '-' ? parseSq(ep) : null,
    halfmove: half ? parseInt(half, 10) : 0,
    fullmove: full ? parseInt(full, 10) : 1
  };
}
