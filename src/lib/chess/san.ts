/** 标准代数记谱（SAN），用于变例树与合法后续列表的展示。 */

import { fileOf, rankOf, sqName } from './board';
import { inCheck, isCastleMove, isEnPassantMove, legalMoves, makeMove } from './movegen';
import type { Move, Position } from './types';

const FILES = 'abcdefgh';

export function toSan(pos: Position, move: Move, legal?: Move[]): string {
  const piece = pos.board[move.from];
  if (!piece) return '?';
  const all = legal ?? legalMoves(pos);

  let san: string;
  if (isCastleMove(pos, move)) {
    san = fileOf(move.to) === 6 ? 'O-O' : 'O-O-O';
  } else {
    san = '';
    if (piece.type !== 'p') {
      san += piece.type.toUpperCase();
      // 消歧：同种棋子也能走到同一落点时，按“列不同用列，否则行不同用行，否则全写”处理
      const rivals = all.filter(
        (m) =>
          m.to === move.to &&
          m.from !== move.from &&
          pos.board[m.from]?.type === piece.type &&
          pos.board[m.from]?.color === piece.color
      );
      if (rivals.length > 0) {
        const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
        const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
        if (!sameFile) san += FILES[fileOf(move.from)];
        else if (!sameRank) san += String(rankOf(move.from) + 1);
        else san += sqName(move.from);
      }
    }
    const isCapture = !!pos.board[move.to] || isEnPassantMove(pos, move);
    if (piece.type === 'p' && isCapture) san += FILES[fileOf(move.from)];
    if (isCapture) san += 'x';
    san += sqName(move.to);
    if (move.promotion) san += '=' + move.promotion.toUpperCase();
  }

  const next = makeMove(pos, move);
  if (inCheck(next, next.turn)) {
    san += legalMoves(next).length === 0 ? '#' : '+';
  }
  return san;
}
