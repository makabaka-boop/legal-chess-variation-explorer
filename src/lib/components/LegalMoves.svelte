<script lang="ts">
  import { controller, gameStore } from '../stores';
  import { legalMoves } from '../chess/movegen';
  import { toSan } from '../chess/san';
  import { sameMove, type Move } from '../chess/types';

  interface Item {
    move: Move;
    san: string;
    exists: boolean;
  }

  function build(c: typeof controller): Item[] {
    const node = c.game.current;
    return legalMoves(node.pos).map((move) => ({
      move,
      san: toSan(node.pos, move),
      exists: node.children.some((ch) => !!ch.move && sameMove(ch.move, move))
    }));
  }

  $: items = build($gameStore);
</script>

<div class="panel">
  <h3>合法后续（{items.length}）</h3>
  {#if items.length === 0}
    <p class="none">无合法走法</p>
  {:else}
    <div class="chips">
      {#each items as it (it.san)}
        <button
          type="button"
          class="chip"
          class:exists={it.exists}
          title={it.exists ? '该走法已存在于变例树中，点击跳转' : '点击走出此步'}
          onclick={() => controller.play(it.move)}
        >{it.san}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .none {
    color: var(--muted);
    margin: 0;
    font-size: 14px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 180px;
    overflow-y: auto;
  }

  .chip {
    background: #3a372f;
    color: var(--text);
    border: 1px solid #4a463f;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 13px;
    font-family: 'Consolas', 'Menlo', monospace;
  }

  .chip:hover {
    border-color: var(--accent);
  }

  .chip.exists {
    border-color: var(--accent);
    color: #cfe3b8;
  }
</style>
