import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { fromFen, initialPosition, sqName } from '../src/lib/chess/board';
import { inCheck, legalMoves, makeMove } from '../src/lib/chess/movegen';
import { toSan } from '../src/lib/chess/san';
import type { Position } from '../src/lib/chess/types';
import { mulberry32, uci } from './helpers';

/**
 * 以独立棋类库 chess.js 作对照（仅测试使用）：
 * 随机对局中逐步比对合法走法集合、SAN 与将军状态。
 */

function expectSameMoves(pos: Position, chess: Chess, context: string): void {
  const mine = legalMoves(pos);
  const mineUci = mine.map(uci).sort();
  const theirs = chess.moves({ verbose: true });
  const theirUci = theirs.map((m) => m.from + m.to + (m.promotion ?? '')).sort();
  expect(mineUci, `合法走法不一致 @ ${context}`).toEqual(theirUci);

  const mineSan = mine.map((m) => toSan(pos, m, mine)).sort();
  const theirSan = theirs.map((m) => m.san).sort();
  expect(mineSan, `SAN 不一致 @ ${context}`).toEqual(theirSan);

  expect(inCheck(pos, pos.turn), `将军状态不一致 @ ${context}`).toBe(chess.inCheck());
}

describe('chess.js 对照：指定局面', () => {
  const FENS: Record<string, string> = {
    初始局面: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    Kiwipete: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    过路兵透线将: '4k3/8/8/2KPp2r/8/8/8/8 w - e6 0 1',
    过路兵可吃: '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1',
    易位经过受攻击格: 'r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1',
    长易位路径受攻击: 'r3k2r/8/8/8/8/8/3r4/R3K2R w KQkq - 0 1',
    b1受攻击仍可长易位: '1r2k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1',
    被将不能易位: 'r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1',
    升变: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    残局: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'
  };

  for (const [name, fen] of Object.entries(FENS)) {
    it(`${name}：当前及每个后续局面（深 2 层）`, () => {
      const pos = fromFen(fen);
      const chess = new Chess(fen);
      expectSameMoves(pos, chess, name);
      for (const m of legalMoves(pos)) {
        const child = new Chess(fen);
        child.move({ from: sqName(m.from), to: sqName(m.to), promotion: m.promotion });
        expectSameMoves(makeMove(pos, m), child, `${name} -> ${uci(m)}`);
      }
    });
  }
});

describe('chess.js 对照：随机对局', () => {
  it('30 盘随机对局逐步比对', () => {
    const rand = mulberry32(20261004);
    for (let game = 0; game < 30; game++) {
      let pos = initialPosition();
      const chess = new Chess();
      for (let ply = 0; ply < 150; ply++) {
        const ctx = `第${game}盘第${ply}步`;
        expectSameMoves(pos, chess, ctx);
        const mine = legalMoves(pos);
        if (mine.length === 0) {
          expect(chess.isCheckmate(), `将死判定不一致 @ ${ctx}`).toBe(inCheck(pos, pos.turn));
          expect(chess.isStalemate(), `逼和判定不一致 @ ${ctx}`).toBe(!inCheck(pos, pos.turn));
          break;
        }
        const pick = mine[Math.floor(rand() * mine.length)];
        chess.move({ from: sqName(pick.from), to: sqName(pick.to), promotion: pick.promotion });
        pos = makeMove(pos, pick);
      }
    }
  });
});
