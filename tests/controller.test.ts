import { describe, expect, it } from 'vitest';
import { fromFen, parseSq } from '../src/lib/chess/board';
import { GameController } from '../src/lib/game/controller';

describe('升变确认流程', () => {
  it('确认前不提交，取消不留幽灵子节点', () => {
    const c = new GameController(fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'));
    const root = c.game.current;

    c.clickSquare(parseSq('a7'));
    expect(c.selected).toBe(parseSq('a7'));
    c.clickSquare(parseSq('a8'));

    // 挂起确认：走法未提交，树上无任何变化
    expect(c.pendingPromotion).toEqual({ from: parseSq('a7'), to: parseSq('a8') });
    expect(c.game.nodeCount).toBe(1);
    expect(c.game.current).toBe(root);
    expect(root.children).toHaveLength(0);
    expect(root.pos.board[parseSq('a8')]).toBeNull();

    // 取消：不留幽灵子节点
    c.cancelPromotion();
    expect(c.pendingPromotion).toBeNull();
    expect(c.game.nodeCount).toBe(1);
    expect(c.game.current).toBe(root);
    expect(root.children).toHaveLength(0);

    // 再次发起并确认升变为马
    c.clickSquare(parseSq('a7'));
    c.clickSquare(parseSq('a8'));
    c.confirmPromotion('n');
    expect(c.game.nodeCount).toBe(2);
    expect(c.game.current.pos.board[parseSq('a8')]).toEqual({ color: 'w', type: 'n' });
    expect(c.game.current.pos.turn).toBe('b');
  });

  it('合法后续列表可直接提交指定升变子', () => {
    const c = new GameController(fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'));
    c.play({ from: parseSq('a7'), to: parseSq('a8'), promotion: 'q' });
    expect(c.game.current.pos.board[parseSq('a8')]).toEqual({ color: 'w', type: 'q' });
    expect(c.game.current.san).toBe('a8=Q+');
  });
});

describe('棋盘点选交互', () => {
  it('选中、取消选中、走子', () => {
    const c = new GameController();
    c.clickSquare(parseSq('e2'));
    expect(c.selected).toBe(parseSq('e2'));

    c.clickSquare(parseSq('e5')); // 非法落点 → 取消选中
    expect(c.selected).toBeNull();

    c.clickSquare(parseSq('e7')); // 对方棋子 → 不选中
    expect(c.selected).toBeNull();

    c.clickSquare(parseSq('e2'));
    c.clickSquare(parseSq('e4')); // 合法 → 走子
    expect(c.game.current.move).toMatchObject({ from: parseSq('e2'), to: parseSq('e4') });
    expect(c.game.current.pos.turn).toBe('b');
    expect(c.selected).toBeNull();
  });

  it('升变挂起期间忽略棋盘点击', () => {
    const c = new GameController(fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'));
    c.clickSquare(parseSq('a7'));
    c.clickSquare(parseSq('a8'));
    expect(c.pendingPromotion).not.toBeNull();
    c.clickSquare(parseSq('e1')); // 应被忽略
    expect(c.pendingPromotion).not.toBeNull();
    expect(c.game.nodeCount).toBe(1);
  });
});
