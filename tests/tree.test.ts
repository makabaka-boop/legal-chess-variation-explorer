import { describe, expect, it } from 'vitest';
import { parseSq } from '../src/lib/chess/board';
import { legalMoves } from '../src/lib/chess/movegen';
import { CASTLE, sameMove, type Move, type PieceType } from '../src/lib/chess/types';
import { Game, MAX_NODES, type GameNode, type PlayResult } from '../src/lib/game/tree';

function play(game: Game, u: string): PlayResult {
  return game.playMove({
    from: parseSq(u.slice(0, 2)),
    to: parseSq(u.slice(2, 4)),
    promotion: u.length > 4 ? (u[4] as PieceType) : undefined
  });
}

function findUntried(game: Game): { node: GameNode; move: Move } | null {
  const queue: GameNode[] = [game.root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const untried = legalMoves(node.pos).find(
      (m) => !node.children.some((c) => c.move && sameMove(c.move, m))
    );
    if (untried) return { node, move: untried };
    queue.push(...node.children);
  }
  return null;
}

describe('变例树：重复次数只沿祖先路径统计', () => {
  it('主线上同一局面第三次出现时可申领三次重复', () => {
    const g = new Game();
    play(g, 'g1f3');
    play(g, 'g8f6');
    play(g, 'f3g1');
    play(g, 'f6g8');
    const secondTime = g.current;
    expect(secondTime.key).toBe(g.root.key);
    expect(secondTime.rep).toBe(2);
    expect(g.status().threefold).toBe(false);

    play(g, 'g1f3');
    play(g, 'g8f6');
    play(g, 'f3g1');
    play(g, 'f6g8');
    expect(g.current.rep).toBe(3);
    expect(g.status().threefold).toBe(true);
  });

  it('回到祖先另走一支：轮次/易位权/过路兵/重复次数只来自该祖先路径', () => {
    const g = new Game();
    play(g, 'g1f3');
    play(g, 'g8f6');
    const afterNf6 = g.current;
    play(g, 'f3g1');
    play(g, 'f6g8');
    const mainlineRep2 = g.current;
    play(g, 'g1f3');
    play(g, 'g8f6');
    play(g, 'f3g1');
    play(g, 'f6g8');
    const mainlineRep3 = g.current;
    expect(mainlineRep3.rep).toBe(3);

    // 回到 1...Nf6 另走 2.Nc3：新分支的一切状态只由祖先路径决定
    g.goTo(afterNf6);
    expect(play(g, 'b1c3')).toBe('created');
    const branch = g.current;
    expect(branch.pos.turn).toBe('b');
    expect(branch.pos.castling).toBe(CASTLE.K | CASTLE.Q | CASTLE.k | CASTLE.q);
    expect(branch.pos.ep).toBeNull();
    expect(branch.rep).toBe(1); // 不把主线兄弟节点的重复历史算进来
    expect(g.status().threefold).toBe(false);

    // 兄弟主线节点的计数不受新分支影响，子树也都还在
    expect(mainlineRep2.rep).toBe(2);
    expect(mainlineRep3.rep).toBe(3);
    expect(afterNf6.children).toHaveLength(2);
  });

  it('过路兵机会不继承兄弟变例', () => {
    const g = new Game();
    play(g, 'e2e4');
    play(g, 'e7e5');
    g.goTo(g.root);
    play(g, 'd2d4');
    const afterD4 = g.current;
    expect(afterD4.pos.ep).toBe(parseSq('d3'));
    expect(afterD4.pos.turn).toBe('b');
    play(g, 'd7d5');
    expect(g.current.pos.ep).toBe(parseSq('d6'));

    // 回到 1.d4 另走 1...Nf6：不能带上 1...d5 那条线的过路兵目标格
    g.goTo(afterD4);
    play(g, 'g8f6');
    expect(g.current.pos.ep).toBeNull();
    expect(g.current.pos.turn).toBe('w');
    expect(g.current.pos.castling).toBe(CASTLE.K | CASTLE.Q | CASTLE.k | CASTLE.q);
  });
});

describe('变例树：节点管理', () => {
  it('重复走已存在的走法只跳转、不新建节点', () => {
    const g = new Game();
    expect(play(g, 'e2e4')).toBe('created');
    const child = g.current;
    expect(g.nodeCount).toBe(2);
    g.goTo(g.root);
    expect(play(g, 'e2e4')).toBe('exists');
    expect(g.current).toBe(child);
    expect(g.nodeCount).toBe(2);
  });

  it('非法走法被拒绝', () => {
    const g = new Game();
    expect(play(g, 'e2e5')).toBe('illegal');
    expect(g.nodeCount).toBe(1);
  });

  it(`节点数上限 ${MAX_NODES}`, () => {
    const g = new Game();
    while (g.nodeCount < MAX_NODES) {
      const found = findUntried(g);
      expect(found).toBeTruthy();
      g.goTo(found!.node);
      expect(g.playMove(found!.move)).toBe('created');
    }
    expect(g.nodeCount).toBe(MAX_NODES);
    const found = findUntried(g);
    expect(found).toBeTruthy();
    g.goTo(found!.node);
    expect(g.playMove(found!.move)).toBe('full');
    expect(g.nodeCount).toBe(MAX_NODES);
  });

  it('删除分支后节点数回落，当前节点退到父节点', () => {
    const g = new Game();
    play(g, 'e2e4');
    play(g, 'e7e5');
    g.goTo(g.root);
    play(g, 'd2d4');
    const variation = g.current;
    play(g, 'd7d5');
    expect(g.nodeCount).toBe(5);
    expect(g.deleteSubtree(variation)).toBe(true);
    expect(g.nodeCount).toBe(3);
    expect(g.current).toBe(g.root);
    expect(g.root.children).toHaveLength(1);
    expect(g.deleteSubtree(g.root)).toBe(false); // 根不可删
  });
});
