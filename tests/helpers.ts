import { sqName } from '../src/lib/chess/board';
import { legalMoves, makeMove } from '../src/lib/chess/movegen';
import type { Move, Position } from '../src/lib/chess/types';

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const m of legalMoves(pos)) {
    nodes += perft(makeMove(pos, m), depth - 1);
  }
  return nodes;
}

export const uci = (m: Move): string =>
  sqName(m.from) + sqName(m.to) + (m.promotion ?? '');

/** 确定性伪随机数（mulberry32），保证测试可复现 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
