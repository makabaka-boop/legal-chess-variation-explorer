/**
 * 三次重复判定用的局面身份键。
 * 键包含：棋子布局 + 行棋方 + 易位权 + 当前“真正合法”的过路兵机会。
 * 若只有过路兵目标格、但因王暴露等原因实际不能吃过路兵，则键中不含该格，
 * 即不产生额外的局面身份（与 FIDE 对“可能走法相同才算同一局面”的口径一致）。
 */

import { makeSq, sqName } from './board';
import { isEnPassantMove, legalMoves } from './movegen';
import { CASTLE, type Move, type Position } from './types';

export function hasLegalEnPassant(pos: Position, legal?: Move[]): boolean {
  if (pos.ep == null) return false;
  const moves = legal ?? legalMoves(pos);
  return moves.some((m) => isEnPassantMove(pos, m));
}

export function positionKey(pos: Position, legal?: Move[]): string {
  let s = '';
  for (let r = 7; r >= 0; r--) {
    for (let f = 0; f < 8; f++) {
      const p = pos.board[makeSq(f, r)];
      s += p ? (p.color === 'w' ? p.type.toUpperCase() : p.type) : '.';
    }
  }
  s += pos.turn;
  s += pos.castling & CASTLE.K ? 'K' : '-';
  s += pos.castling & CASTLE.Q ? 'Q' : '-';
  s += pos.castling & CASTLE.k ? 'k' : '-';
  s += pos.castling & CASTLE.q ? 'q' : '-';
  s += hasLegalEnPassant(pos, legal) ? sqName(pos.ep!) : '-';
  return s;
}
