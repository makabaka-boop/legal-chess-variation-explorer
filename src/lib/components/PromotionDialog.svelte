<script lang="ts">
  import { controller, gameStore } from '../stores';
  import type { PieceType } from '../chess/types';

  const GLYPHS: Record<string, string> = {
    wq: '♕', wr: '♖', wb: '♗', wn: '♘',
    bq: '♛', br: '♜', bb: '♝', bn: '♞'
  };
  const TYPES: PieceType[] = ['q', 'r', 'b', 'n'];

  $: pending = $gameStore.pendingPromotion;
  $: color = pending ? $gameStore.game.current.pos.board[pending.from]?.color ?? 'w' : 'w';
</script>

{#if pending}
  <div class="overlay" role="presentation" onclick={() => controller.cancelPromotion()}>
    <div
      class="dialog"
      role="dialog"
      tabindex="-1"
      aria-label="选择升变棋子"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <p>选择升变棋子：</p>
      <div class="choices">
        {#each TYPES as t (t)}
          <button type="button" class="choice" onclick={() => controller.confirmPromotion(t)}>
            {GLYPHS[color + t]}
          </button>
        {/each}
      </div>
      <button type="button" class="cancel" onclick={() => controller.cancelPromotion()}>取消</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .dialog {
    background: var(--panel);
    border-radius: 12px;
    padding: 20px 24px;
    text-align: center;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }

  .dialog p {
    margin: 0 0 12px;
  }

  .choices {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .choice {
    font-size: 40px;
    width: 64px;
    height: 64px;
    border-radius: 10px;
    border: 1px solid #4a463f;
    background: #3a372f;
    color: var(--text);
  }

  .choice:hover {
    border-color: var(--accent);
    background: #45423a;
  }

  .cancel {
    margin-top: 14px;
    background: transparent;
    border: 1px solid #4a463f;
    color: var(--muted);
    border-radius: 6px;
    padding: 6px 16px;
  }

  .cancel:hover {
    color: var(--text);
  }
</style>
