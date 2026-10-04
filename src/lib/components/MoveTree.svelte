<script lang="ts">
  import { controller, gameStore } from '../stores';
  import type { GameNode } from '../game/tree';

  export let node: GameNode;

  $: current = $gameStore.game.current;

  function label(n: GameNode, isMainLine: boolean): string {
    if (!n.move || !n.parent) return '';
    const fm = n.parent.pos.fullmove;
    if (n.parent.pos.turn === 'w') return `${fm}. ${n.san}`;
    return isMainLine ? n.san : `${fm}… ${n.san}`;
  }
</script>

<span class="line">
  {#if node.move}
    <button
      type="button"
      class="node"
      class:current={node === current}
      onclick={() => controller.goTo(node)}
    >{label(node, node.parent?.children[0] === node)}</button>
  {:else}
    <button
      type="button"
      class="node root"
      class:current={node === current}
      onclick={() => controller.goTo(node)}
    >开局</button>
  {/if}
  {#each node.children as child, i (child.id)}
    {#if i === 0}
      <svelte:self node={child} />
    {:else}
      <span class="variation">(<svelte:self node={child} />)</span>
    {/if}
  {/each}
</span>

<style>
  .line {
    display: inline;
  }

  .node {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 1px 4px;
    margin: 1px 0;
    border-radius: 4px;
    font-size: 14px;
    font-family: 'Consolas', 'Menlo', monospace;
  }

  .node:hover {
    background: #3a372f;
  }

  .node.current {
    background: var(--accent);
    color: #10140c;
    font-weight: 700;
  }

  .node.root {
    color: var(--muted);
  }

  .variation {
    display: block;
    margin-left: 18px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
