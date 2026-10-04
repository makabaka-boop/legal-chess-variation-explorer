/**
 * 变例树：每个节点保存“走完该步后的局面”。
 * 节点的轮次、易位权、过路兵机会都由其祖先路径上的走法重放得到；
 * 重复次数也只沿“根 → 当前节点”的路径统计，绝不继承兄弟变例的历史。
 */

import { initialPosition } from '../chess/board';
import { positionKey } from '../chess/key';
import { inCheck, legalMoves, makeMove } from '../chess/movegen';
import { toSan } from '../chess/san';
import { sameMove, type Color, type Move, type Position } from '../chess/types';

export const MAX_NODES = 200;

export interface GameNode {
  id: number;
  parent: GameNode | null;
  /** 导致本节点的走法（根为 null） */
  move: Move | null;
  san: string;
  children: GameNode[];
  /** 走完 move 后的局面（根为初始局面） */
  pos: Position;
  /** 重复判定用的局面键 */
  key: string;
  /** 本局面键在“根 → 本节点”路径上出现的次数（含本节点） */
  rep: number;
}

export interface Status {
  turn: Color;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  /** 当前局面在路径上已出现 >= 3 次，可申领三次重复和棋 */
  threefold: boolean;
  repetition: number;
  legalCount: number;
}

export type PlayResult = 'created' | 'exists' | 'full' | 'illegal';

export class Game {
  readonly root: GameNode;
  current: GameNode;
  nodeCount = 1;
  private nextId = 1;

  constructor(startPos: Position = initialPosition()) {
    this.root = {
      id: 0,
      parent: null,
      move: null,
      san: '',
      children: [],
      pos: startPos,
      key: positionKey(startPos),
      rep: 1
    };
    this.current = this.root;
  }

  legalMovesAt(node: GameNode = this.current): Move[] {
    return legalMoves(node.pos);
  }

  /** 走出一步：已存在的相同走法只跳转不重复建点；超过 MAX_NODES 拒绝新建。 */
  playMove(move: Move): PlayResult {
    const existing = this.current.children.find((c) => c.move && sameMove(c.move, move));
    if (existing) {
      this.current = existing;
      return 'exists';
    }
    const legal = legalMoves(this.current.pos);
    const canonical = legal.find((m) => sameMove(m, move));
    if (!canonical) return 'illegal';
    if (this.nodeCount >= MAX_NODES) return 'full';

    const parent = this.current;
    const pos = makeMove(parent.pos, canonical);
    const key = positionKey(pos);
    // 重复次数只沿祖先路径统计
    let rep = 1;
    for (let n: GameNode | null = parent; n; n = n.parent) {
      if (n.key === key) rep++;
    }
    const node: GameNode = {
      id: this.nextId++,
      parent,
      move: canonical,
      san: toSan(parent.pos, canonical),
      children: [],
      pos,
      key,
      rep
    };
    parent.children.push(node);
    this.nodeCount++;
    this.current = node;
    return 'created';
  }

  goTo(node: GameNode): void {
    this.current = node;
  }

  /** 根 → node 的路径（含两端） */
  pathTo(node: GameNode = this.current): GameNode[] {
    const path: GameNode[] = [];
    for (let n: GameNode | null = node; n; n = n.parent) path.push(n);
    return path.reverse();
  }

  subtreeSize(node: GameNode): number {
    let n = 1;
    for (const c of node.children) n += this.subtreeSize(c);
    return n;
  }

  /** 删除 node 及其整个子树（不能删根）；若当前节点在被删子树内则退到父节点。 */
  deleteSubtree(node: GameNode): boolean {
    if (!node.parent) return false;
    const idx = node.parent.children.indexOf(node);
    if (idx < 0) return false;
    node.parent.children.splice(idx, 1);
    this.nodeCount -= this.subtreeSize(node);
    for (let n: GameNode | null = this.current; n; n = n.parent) {
      if (n === node) {
        this.current = node.parent;
        break;
      }
    }
    return true;
  }

  status(): Status {
    const pos = this.current.pos;
    const moves = legalMoves(pos);
    const check = inCheck(pos, pos.turn);
    return {
      turn: pos.turn,
      check,
      checkmate: check && moves.length === 0,
      stalemate: !check && moves.length === 0,
      threefold: this.current.rep >= 3,
      repetition: this.current.rep,
      legalCount: moves.length
    };
  }
}
