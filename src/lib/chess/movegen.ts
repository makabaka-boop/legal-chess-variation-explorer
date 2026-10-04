/**
 * 合法走子生成（自研实现）：
 * - 攻击检测、伪合法走子、以“走后己方王是否被攻击”过滤出合法走子；
 * - 王车易位：王经过的格子不能被攻击；
 * - 吃过路兵：真正移除被吃的兵再验王安全，因此“两兵离队暴露底线/横线将”的情形会被正确判非法；
 * - 升变：抵达底线生成后/车/象/马四种走法。
 */

import { fileOf, rankOf, makeSq, onBoard } from './board';
import { CASTLE, opp, type Color, type Move, type Position } from './types';

const KNIGHT_OFFS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]
];
const KING_OFFS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]
];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** sq 是否被 by 方攻击 */
export function isAttacked(pos: Position, sq: number, by: Color): boolean {
  const b = pos.board;
  const f = fileOf(sq);
  const r = rankOf(sq);

  // 兵：白兵在 (f±1, r-1) 攻击 sq；黑兵在 (f±1, r+1)
  const pawnRank = by === 'w' ? r - 1 : r + 1;
  for (const df of [-1, 1] as const) {
    const pf = f + df;
    if (onBoard(pf, pawnRank)) {
      const p = b[makeSq(pf, pawnRank)];
      if (p && p.color === by && p.type === 'p') return true;
    }
  }
  // 马
  for (const [df, dr] of KNIGHT_OFFS) {
    if (onBoard(f + df, r + dr)) {
      const p = b[makeSq(f + df, r + dr)];
      if (p && p.color === by && p.type === 'n') return true;
    }
  }
  // 王
  for (const [df, dr] of KING_OFFS) {
    if (onBoard(f + df, r + dr)) {
      const p = b[makeSq(f + df, r + dr)];
      if (p && p.color === by && p.type === 'k') return true;
    }
  }
  // 车/后（直线）
  for (const [df, dr] of ROOK_DIRS) {
    let cf = f + df;
    let cr = r + dr;
    while (onBoard(cf, cr)) {
      const p = b[makeSq(cf, cr)];
      if (p) {
        if (p.color === by && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      cf += df;
      cr += dr;
    }
  }
  // 象/后（斜线）
  for (const [df, dr] of BISHOP_DIRS) {
    let cf = f + df;
    let cr = r + dr;
    while (onBoard(cf, cr)) {
      const p = b[makeSq(cf, cr)];
      if (p) {
        if (p.color === by && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      cf += df;
      cr += dr;
    }
  }
  return false;
}

export function findKing(pos: Position, color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i];
    if (p && p.color === color && p.type === 'k') return i;
  }
  return -1;
}

export function inCheck(pos: Position, color: Color): boolean {
  const ksq = findKing(pos, color);
  return ksq >= 0 && isAttacked(pos, ksq, opp(color));
}

const PROMO_TYPES = ['q', 'r', 'b', 'n'] as const;

/** 伪合法走子（不验王安全；易位只验权利与空格） */
export function pseudoMoves(pos: Position): Move[] {
  const out: Move[] = [];
  const b = pos.board;
  const us = pos.turn;

  for (let from = 0; from < 64; from++) {
    const piece = b[from];
    if (!piece || piece.color !== us) continue;
    const f = fileOf(from);
    const r = rankOf(from);

    if (piece.type === 'p') {
      const dir = us === 'w' ? 1 : -1;
      const startRank = us === 'w' ? 1 : 6;
      const promoRank = us === 'w' ? 7 : 0;
      // 直进
      const oneRank = r + dir;
      if (onBoard(f, oneRank)) {
        const one = makeSq(f, oneRank);
        if (!b[one]) {
          if (oneRank === promoRank) {
            for (const t of PROMO_TYPES) out.push({ from, to: one, promotion: t });
          } else {
            out.push({ from, to: one });
            if (r === startRank) {
              const two = makeSq(f, r + 2 * dir);
              if (!b[two]) out.push({ from, to: two });
            }
          }
        }
      }
      // 斜吃（含过路兵）
      for (const df of [-1, 1] as const) {
        const tf = f + df;
        const tr = r + dir;
        if (!onBoard(tf, tr)) continue;
        const to = makeSq(tf, tr);
        const target = b[to];
        if (target && target.color !== us) {
          if (tr === promoRank) {
            for (const t of PROMO_TYPES) out.push({ from, to, promotion: t });
          } else {
            out.push({ from, to });
          }
        } else if (!target && pos.ep === to) {
          out.push({ from, to }); // 吃过路兵
        }
      }
    } else if (piece.type === 'n' || piece.type === 'k') {
      const offs = piece.type === 'n' ? KNIGHT_OFFS : KING_OFFS;
      for (const [df, dr] of offs) {
        const tf = f + df;
        const tr = r + dr;
        if (!onBoard(tf, tr)) continue;
        const to = makeSq(tf, tr);
        const target = b[to];
        if (!target || target.color !== us) out.push({ from, to });
      }
      // 王车易位（空格与权利在此检查；被攻击格在 legalMoves 中检查）
      if (piece.type === 'k') {
        if (us === 'w' && from === 4) {
          if (pos.castling & CASTLE.K && !b[5] && !b[6]) out.push({ from: 4, to: 6 });
          if (pos.castling & CASTLE.Q && !b[3] && !b[2] && !b[1]) out.push({ from: 4, to: 2 });
        } else if (us === 'b' && from === 60) {
          if (pos.castling & CASTLE.k && !b[61] && !b[62]) out.push({ from: 60, to: 62 });
          if (pos.castling & CASTLE.q && !b[59] && !b[58] && !b[57]) out.push({ from: 60, to: 58 });
        }
      }
    } else {
      const dirs =
        piece.type === 'r' ? ROOK_DIRS : piece.type === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
      for (const [df, dr] of dirs) {
        let cf = f + df;
        let cr = r + dr;
        while (onBoard(cf, cr)) {
          const to = makeSq(cf, cr);
          const target = b[to];
          if (!target) {
            out.push({ from, to });
          } else {
            if (target.color !== us) out.push({ from, to });
            break;
          }
          cf += df;
          cr += dr;
        }
      }
    }
  }
  return out;
}

export function isCastleMove(pos: Position, m: Move): boolean {
  const p = pos.board[m.from];
  return !!p && p.type === 'k' && Math.abs(fileOf(m.to) - fileOf(m.from)) === 2;
}

export function isEnPassantMove(pos: Position, m: Move): boolean {
  const p = pos.board[m.from];
  return (
    !!p &&
    p.type === 'p' &&
    pos.ep === m.to &&
    fileOf(m.from) !== fileOf(m.to) &&
    !pos.board[m.to]
  );
}

/** 执行走法，返回新局面（不可变更新）。 */
export function makeMove(pos: Position, m: Move): Position {
  const board = pos.board.slice();
  const piece = board[m.from]!;
  const us = piece.color;
  board[m.from] = null;

  // 吃过路兵：移除身后被吃的兵（必须在验王安全前移除）
  if (isEnPassantMove(pos, m)) {
    board[m.to + (us === 'w' ? -8 : 8)] = null;
  }
  board[m.to] = m.promotion ? { color: us, type: m.promotion } : piece;

  // 易位时动车
  if (piece.type === 'k' && Math.abs(fileOf(m.to) - fileOf(m.from)) === 2) {
    if (m.to === 6) { board[5] = board[7]; board[7] = null; }
    else if (m.to === 2) { board[3] = board[0]; board[0] = null; }
    else if (m.to === 62) { board[61] = board[63]; board[63] = null; }
    else if (m.to === 58) { board[59] = board[56]; board[56] = null; }
  }

  // 易位权更新：王动则双方权利尽失；角上的车移动或被吃，失去对应权利
  let castling = pos.castling;
  if (piece.type === 'k') castling &= ~(us === 'w' ? CASTLE.K | CASTLE.Q : CASTLE.k | CASTLE.q);
  if (m.from === 0 || m.to === 0) castling &= ~CASTLE.Q;
  if (m.from === 7 || m.to === 7) castling &= ~CASTLE.K;
  if (m.from === 56 || m.to === 56) castling &= ~CASTLE.q;
  if (m.from === 63 || m.to === 63) castling &= ~CASTLE.k;

  // 兵走两格产生过路兵目标格
  let ep: number | null = null;
  if (piece.type === 'p' && Math.abs(m.to - m.from) === 16) ep = (m.from + m.to) >> 1;

  const isCapture = !!pos.board[m.to] || isEnPassantMove(pos, m);
  return {
    board,
    turn: opp(us),
    castling,
    ep,
    halfmove: piece.type === 'p' || isCapture ? 0 : pos.halfmove + 1,
    fullmove: pos.fullmove + (us === 'b' ? 1 : 0)
  };
}

/** 合法走子：伪合法走子中，走后己方王不被攻击者；易位额外要求王的路径不被攻击。 */
export function legalMoves(pos: Position): Move[] {
  const out: Move[] = [];
  const us = pos.turn;
  const them = opp(us);
  for (const m of pseudoMoves(pos)) {
    if (isCastleMove(pos, m)) {
      const step = m.to > m.from ? 1 : -1;
      const mid = m.from + step;
      if (isAttacked(pos, m.from, them)) continue; // 王正被将
      if (isAttacked(pos, mid, them)) continue; // 王经过的格子被攻击
      if (isAttacked(pos, m.to, them)) continue; // 王落点被攻击
      out.push(m);
    } else {
      const next = makeMove(pos, m);
      const ksq = findKing(next, us);
      if (ksq >= 0 && !isAttacked(next, ksq, them)) out.push(m);
    }
  }
  return out;
}
