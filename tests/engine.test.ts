import { describe, expect, it } from 'vitest';
import { fromFen, parseSq, sqName } from '../src/lib/chess/board';
import { hasLegalEnPassant, positionKey } from '../src/lib/chess/key';
import { inCheck, legalMoves, makeMove } from '../src/lib/chess/movegen';
import { CASTLE } from '../src/lib/chess/types';
import { uci } from './helpers';

describe('吃过路兵与王安全', () => {
  // 白王 c5、白兵 d5、黑兵 e5（刚走 e7-e5）、黑车 h5：
  // dxe6 e.p. 会把 d5、e5 两兵同时移出第 5 横线，Kc5 暴露给 Rh5 —— 必须判非法。
  const PINNED_EP = '4k3/8/8/2KPp2r/8/8/8/8 w - e6 0 1';

  it('过路兵吃子导致透线将军时该走法非法', () => {
    const pos = fromFen(PINNED_EP);
    const moves = legalMoves(pos).map(uci);
    expect(moves).not.toContain('d5e6');
    // 但王的普通走法仍然存在
    expect(moves.length).toBeGreaterThan(0);
  });

  it('不能吃过路兵时，目标格不产生额外局面身份', () => {
    const withEp = fromFen(PINNED_EP);
    const withoutEp = fromFen('4k3/8/8/2KPp2r/8/8/8/8 w - - 0 1');
    expect(hasLegalEnPassant(withEp)).toBe(false);
    expect(positionKey(withEp)).toBe(positionKey(withoutEp));
  });

  it('过路兵真正可吃时，目标格进入局面键', () => {
    const withEp = fromFen('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
    const withoutEp = fromFen('4k3/8/8/3Pp3/8/8/8/4K3 w - - 0 1');
    expect(hasLegalEnPassant(withEp)).toBe(true);
    expect(legalMoves(withEp).map(uci)).toContain('d5e6');
    expect(positionKey(withEp)).not.toBe(positionKey(withoutEp));
  });

  it('过路兵吃子实际移除被吃的兵', () => {
    const pos = fromFen('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
    const mv = legalMoves(pos).find((m) => uci(m) === 'd5e6')!;
    const next = makeMove(pos, mv);
    expect(next.board[parseSq('e6')]).toEqual({ color: 'w', type: 'p' });
    expect(next.board[parseSq('e5')]).toBeNull();
    expect(next.board[parseSq('d5')]).toBeNull();
  });
});

describe('王车易位', () => {
  const uciList = (fen: string) => legalMoves(fromFen(fen)).map(uci);

  it('王经过受攻击的格子（f1）时短易位非法、长易位仍合法', () => {
    const moves = uciList('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1');
    expect(moves).not.toContain('e1g1');
    expect(moves).toContain('e1c1');
  });

  it('王经过受攻击的格子（d1）时长易位非法、短易位仍合法', () => {
    const moves = uciList('r3k2r/8/8/8/8/8/3r4/R3K2R w KQkq - 0 1');
    expect(moves).not.toContain('e1c1');
    expect(moves).toContain('e1g1');
  });

  it('b1 受攻击不影响长易位（b1 不在王的路径上）', () => {
    const moves = uciList('1r2k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1');
    expect(moves).toContain('e1c1');
  });

  it('王正被将军时两个方向都不能易位', () => {
    const moves = uciList('r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1');
    expect(moves).not.toContain('e1g1');
    expect(moves).not.toContain('e1c1');
  });

  it('易位同时移动王和车', () => {
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const mv = legalMoves(pos).find((m) => uci(m) === 'e1g1')!;
    const next = makeMove(pos, mv);
    expect(next.board[parseSq('g1')]).toEqual({ color: 'w', type: 'k' });
    expect(next.board[parseSq('f1')]).toEqual({ color: 'w', type: 'r' });
    expect(next.board[parseSq('e1')]).toBeNull();
    expect(next.board[parseSq('h1')]).toBeNull();
    expect(next.castling & (CASTLE.K | CASTLE.Q)).toBe(0);
  });
});

describe('易位权的丧失', () => {
  it('角上的车被吃，对应易位权立即消失', () => {
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const mv = legalMoves(pos).find((m) => uci(m) === 'a1a8')!; // Rxa8
    const next = makeMove(pos, mv);
    expect(next.castling & CASTLE.q).toBe(0); // 黑方长易位权被吃没
    expect(next.castling & CASTLE.Q).toBe(0); // 白车离开 a1，白方长易位权也没了
    expect(next.castling & CASTLE.K).toBeTruthy();
    expect(next.castling & CASTLE.k).toBeTruthy();
  });

  it('车离开角格失去对应权利', () => {
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const mv = legalMoves(pos).find((m) => uci(m) === 'h1h2')!;
    const next = makeMove(pos, mv);
    expect(next.castling & CASTLE.K).toBe(0);
    expect(next.castling & CASTLE.Q).toBeTruthy();
  });

  it('王移动后双方易位权尽失', () => {
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const mv = legalMoves(pos).find((m) => uci(m) === 'e1e2' || uci(m) === 'e1d1' || uci(m) === 'e1f1')!;
    const next = makeMove(pos, mv);
    expect(next.castling & (CASTLE.K | CASTLE.Q)).toBe(0);
    expect(next.castling & (CASTLE.k | CASTLE.q)).toBeTruthy();
  });

  it('易位权变化反映在局面键中', () => {
    const a = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const b = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1');
    expect(positionKey(a)).not.toBe(positionKey(b));
  });
});

describe('将军/将死/逼和状态', () => {
  it('闪电将死（fool\'s mate）', () => {
    let pos = fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    for (const u of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
      const mv = legalMoves(pos).find((m) => uci(m) === u)!;
      pos = makeMove(pos, mv);
    }
    expect(inCheck(pos, 'w')).toBe(true);
    expect(legalMoves(pos)).toHaveLength(0); // 将死
  });

  it('逼和局面无合法走法但未被将军', () => {
    const pos = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(inCheck(pos, 'b')).toBe(false);
    expect(legalMoves(pos)).toHaveLength(0);
  });

  it('升变生成四种走法', () => {
    const pos = fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const promos = legalMoves(pos).filter((m) => sqName(m.from) === 'a7' && sqName(m.to) === 'a8');
    expect(promos.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);
  });
});
