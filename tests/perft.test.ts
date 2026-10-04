import { describe, expect, it } from 'vitest';
import { fromFen, initialPosition } from '../src/lib/chess/board';
import { perft } from './helpers';

/**
 * 标准 perft 基准（Chess Programming Wiki 的公开数据），
 * 覆盖普通走子、易位、过路兵、升变、牵制等全部规则交互。
 */
describe('perft 基准节点数', () => {
  it('初始局面', () => {
    const pos = initialPosition();
    expect(perft(pos, 1)).toBe(20);
    expect(perft(pos, 2)).toBe(400);
    expect(perft(pos, 3)).toBe(8902);
    expect(perft(pos, 4)).toBe(197281);
  });

  it('Kiwipete（密集易位/牵制）', () => {
    const pos = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(pos, 1)).toBe(48);
    expect(perft(pos, 2)).toBe(2039);
    expect(perft(pos, 3)).toBe(97862);
  });

  it('位置 3（过路兵与透线将）', () => {
    const pos = fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(perft(pos, 1)).toBe(14);
    expect(perft(pos, 2)).toBe(191);
    expect(perft(pos, 3)).toBe(2812);
    expect(perft(pos, 4)).toBe(43238);
  });

  it('位置 4（大量升变）', () => {
    const pos = fromFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(perft(pos, 1)).toBe(6);
    expect(perft(pos, 2)).toBe(264);
    expect(perft(pos, 3)).toBe(9467);
  });

  it('位置 5', () => {
    const pos = fromFen('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect(perft(pos, 1)).toBe(44);
    expect(perft(pos, 2)).toBe(1486);
    expect(perft(pos, 3)).toBe(62379);
  });
});
