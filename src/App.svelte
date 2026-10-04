<script lang="ts">
  import Board from './lib/components/Board.svelte';
  import MoveTree from './lib/components/MoveTree.svelte';
  import LegalMoves from './lib/components/LegalMoves.svelte';
  import PromotionDialog from './lib/components/PromotionDialog.svelte';
  import { controller, gameStore } from './lib/stores';
  import type { Status } from './lib/game/tree';

  $: st = $gameStore.status();
  $: nodeCount = $gameStore.game.nodeCount;
  $: root = $gameStore.game.root;
  $: current = $gameStore.game.current;
  $: message = $gameStore.message;

  function statusLines(s: Status): string[] {
    const lines: string[] = [];
    const side = s.turn === 'w' ? '白方' : '黑方';
    if (s.checkmate) {
      lines.push(`将死！${s.turn === 'w' ? '黑' : '白'}方胜`);
    } else if (s.stalemate) {
      lines.push('逼和（无合法走法）');
    } else {
      lines.push(`${side}行棋${s.check ? ' · 将军！' : ''}`);
    }
    if (s.threefold) {
      lines.push(`本局面第 ${s.repetition} 次出现 —— 可申领三次重复和棋`);
    } else if (s.repetition > 1) {
      lines.push(`本局面第 ${s.repetition} 次出现`);
    }
    return lines;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      controller.goParent();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      controller.goChild();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<header class="top">
  <h1>国际象棋变例板</h1>
  <span class="node-count">节点 {nodeCount} / {controller.maxNodes}</span>
  <div class="controls">
    <button type="button" onclick={() => controller.goStart()} disabled={current === root}>⏮ 开局</button>
    <button type="button" onclick={() => controller.goParent()} disabled={!current.parent}>◀ 上一步</button>
    <button type="button" onclick={() => controller.goChild()} disabled={current.children.length === 0}>下一步 ▶</button>
    <button type="button" onclick={() => controller.deleteCurrentBranch()} disabled={!current.parent}>删除本分支</button>
    <button type="button" onclick={() => controller.reset()} disabled={root.children.length === 0}>清空</button>
  </div>
</header>

{#if message}
  <div class="message">{message}</div>
{/if}

<main class="layout">
  <div class="board-col">
    <Board />
    <div class="panel status-panel">
      {#each statusLines(st) as line, i (i)}
        <div class="status-line" class:emph={i === 0 && (st.checkmate || st.stalemate || st.threefold)}>{line}</div>
      {/each}
    </div>
  </div>
  <div class="side-col">
    <LegalMoves />
    <div class="panel tree-panel">
      <h3>变例树（点击任意节点回到该局面，另走一子即成分支）</h3>
      <div class="tree">
        <MoveTree node={root} />
      </div>
    </div>
  </div>
</main>

<PromotionDialog />

<style>
  .status-panel {
    margin-top: 12px;
    width: calc(64px * 8 + 8px);
    max-width: 100%;
  }

  .status-line {
    font-size: 15px;
    padding: 2px 0;
  }

  .status-line.emph {
    font-weight: 700;
    color: #f0c674;
  }

  .tree-panel .tree {
    max-height: 320px;
    overflow: auto;
    line-height: 1.7;
    font-size: 14px;
  }

  @media (max-width: 640px) {
    .status-panel {
      width: 100%;
    }
  }
</style>
