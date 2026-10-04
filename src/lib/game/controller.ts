/**
 * 棋盘交互控制器（框架无关，便于测试）：
 * - 选中/落子、升变确认（确认前不提交，取消不留幽灵子节点）；
 * - 在变例树上前进了/回退/跳转/删分支；
 * - 通过 subscribe 通知 UI 刷新。
 */

import { legalMoves } from '../chess/movegen';
import type { Position } from '../chess/types';
import { type Move, type PieceType } from '../chess/types';
import { Game, MAX_NODES, type GameNode, type Status } from './tree';

export interface PendingPromotion {
  from: number;
  to: number;
}

export class GameController {
  readonly game: Game;
  selected: number | null = null;
  /** 升变待确认：此时走法尚未提交到树 */
  pendingPromotion: PendingPromotion | null = null;
  message: string | null = null;

  private listeners = new Set<() => void>();

  constructor(startPos?: Position) {
    this.game = new Game(startPos);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  get current(): GameNode {
    return this.game.current;
  }

  get maxNodes(): number {
    return MAX_NODES;
  }

  legalMoves(): Move[] {
    return legalMoves(this.game.current.pos);
  }

  movesFrom(sq: number): Move[] {
    if (sq == null) return [];
    return this.legalMoves().filter((m) => m.from === sq);
  }

  status(): Status {
    return this.game.status();
  }

  /** 点击棋盘格 */
  clickSquare(sq: number): void {
    if (this.pendingPromotion) return; // 升变确认期间忽略棋盘点击
    this.message = null;
    const pos = this.game.current.pos;

    if (this.selected != null && this.selected !== sq) {
      const targets = this.legalMoves().filter((m) => m.from === this.selected && m.to === sq);
      if (targets.length > 0) {
        if (targets.some((m) => m.promotion)) {
          // 升变：先挂起，等用户确认，不落子、不建节点
          this.pendingPromotion = { from: this.selected, to: sq };
        } else {
          this.commit(targets[0]);
        }
        this.selected = null;
        this.emit();
        return;
      }
    }

    const piece = pos.board[sq];
    this.selected = piece && piece.color === pos.turn ? sq : null;
    this.emit();
  }

  /** 直接提交一个合法走法（合法后续列表点击时使用，升变走法自带 promotion） */
  play(move: Move): void {
    this.message = null;
    this.commit(move);
    this.selected = null;
    this.emit();
  }

  private commit(move: Move): void {
    const res = this.game.playMove(move);
    if (res === 'full') {
      this.message = `已达 ${MAX_NODES} 个变例节点上限，无法新建分支`;
    } else if (res === 'illegal') {
      this.message = '非法走法';
    }
  }

  confirmPromotion(type: PieceType): void {
    const p = this.pendingPromotion;
    if (!p) return;
    this.pendingPromotion = null;
    this.commit({ from: p.from, to: p.to, promotion: type });
    this.emit();
  }

  /** 取消升变：走法从未提交，树上不会留下任何子节点 */
  cancelPromotion(): void {
    this.pendingPromotion = null;
    this.emit();
  }

  goTo(node: GameNode): void {
    this.game.goTo(node);
    this.selected = null;
    this.pendingPromotion = null;
    this.message = null;
    this.emit();
  }

  goStart(): void {
    this.goTo(this.game.root);
  }

  goParent(): void {
    if (this.game.current.parent) this.goTo(this.game.current.parent);
  }

  goChild(): void {
    const first = this.game.current.children[0];
    if (first) this.goTo(first);
  }

  deleteCurrentBranch(): void {
    const node = this.game.current;
    if (node.parent) {
      this.game.deleteSubtree(node);
      this.selected = null;
      this.pendingPromotion = null;
      this.emit();
    }
  }

  reset(): void {
    this.game.goTo(this.game.root);
    this.game.root.children.length = 0;
    this.game.nodeCount = 1;
    this.selected = null;
    this.pendingPromotion = null;
    this.message = null;
    this.emit();
  }
}
