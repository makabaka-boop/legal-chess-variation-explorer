<script lang="ts">
  import { controller, gameStore } from '../stores';
  import { findKing, inCheck, isEnPassantMove, legalMoves } from '../chess/movegen';
  import type { Move } from '../chess/types';

  const GLYPHS: Record<string, string> = {
    wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
  };

  interface SquareView {
    sq: number;
    glyph: string | null;
    pieceColor: 'w' | 'b' | null;
    light: boolean;
    selected: boolean;
    lastMove: boolean;
    checkSquare: boolean;
    target: Move | null;
    capture: boolean;
    coordFile: string | null;
    coordRank: string | null;
  }

  function buildView(c: typeof controller): SquareView[] {
    const pos = c.game.current.pos;
    const moves = legalMoves(pos);
    const selected = c.selected;
    const last = c.game.current.move;
    const checkSq = inCheck(pos, pos.turn) ? findKing(pos, pos.turn) : -1;
    const out: SquareView[] = [];
    for (let r = 7; r >= 0; r--) {
      for (let f = 0; f < 8; f++) {
        const sq = r * 8 + f;
        const p = pos.board[sq];
        const target = selected != null ? moves.find((m) => m.from === selected && m.to === sq) ?? null : null;
        out.push({
          sq,
          glyph: p ? GLYPHS[p.color + p.type] : null,
          pieceColor: p ? p.color : null,
          light: (f + r) % 2 === 1,
          selected: selected === sq,
          lastMove: !!last && (last.from === sq || last.to === sq),
          checkSquare: sq === checkSq,
          target,
          capture: !!target && (!!pos.board[sq] || isEnPassantMove(pos, target)),
          coordFile: r === 0 ? 'abcdefgh'[f] : null,
          coordRank: f === 0 ? String(r + 1) : null
        });
      }
    }
    return out;
  }

  $: view = buildView($gameStore);
</script>

<div class="board" role="grid" aria-label="棋盘">
  {#each view as s (s.sq)}
    <button
      type="button"
      class="sq"
      class:light={s.light}
      class:dark={!s.light}
      class:selected={s.selected}
      class:last={s.lastMove}
      class:check={s.checkSquare}
      onclick={() => controller.clickSquare(s.sq)}
    >
      {#if s.coordRank}<span class="coord rank">{s.coordRank}</span>{/if}
      {#if s.coordFile}<span class="coord file">{s.coordFile}</span>{/if}
      {#if s.glyph}<span class="piece {s.pieceColor}">{s.glyph}</span>{/if}
      {#if s.target}
        {#if s.capture}<span class="ring"></span>{:else}<span class="dot"></span>{/if}
      {/if}
    </button>
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(8, 64px);
    grid-template-rows: repeat(8, 64px);
    border: 4px solid #4a463f;
    border-radius: 6px;
    overflow: hidden;
    user-select: none;
  }

  .sq {
    position: relative;
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sq.light { background: var(--light-sq); }
  .sq.dark { background: var(--dark-sq); }

  .sq.last.light { background: color-mix(in srgb, var(--light-sq) 55%, var(--last)); }
  .sq.last.dark { background: color-mix(in srgb, var(--dark-sq) 55%, var(--last)); }

  .sq.selected.light,
  .sq.selected.dark { background: var(--sel); }

  .sq.check.light,
  .sq.check.dark {
    background: radial-gradient(circle, var(--check) 20%, transparent 75%),
      var(--sel);
  }

  .piece {
    font-size: 46px;
    line-height: 1;
    pointer-events: none;
  }

  .piece.w { color: #f8f8f8; text-shadow: 0 0 3px #333, 0 1px 2px #333; }
  .piece.b { color: #1c1a17; text-shadow: 0 0 2px #666; }

  .dot {
    position: absolute;
    width: 22%;
    height: 22%;
    border-radius: 50%;
    background: rgba(20, 30, 20, 0.35);
    pointer-events: none;
  }

  .ring {
    position: absolute;
    inset: 4%;
    border-radius: 50%;
    border: 4px solid rgba(20, 30, 20, 0.4);
    pointer-events: none;
  }

  .coord {
    position: absolute;
    font-size: 11px;
    font-weight: 700;
    pointer-events: none;
  }

  .coord.rank { top: 2px; left: 3px; }
  .coord.file { bottom: 1px; right: 4px; }

  .sq.light .coord { color: var(--dark-sq); }
  .sq.dark .coord { color: var(--light-sq); }

  @media (max-width: 640px) {
    .board {
      grid-template-columns: repeat(8, 11.5vw);
      grid-template-rows: repeat(8, 11.5vw);
    }
    .piece { font-size: 8vw; }
  }
</style>
