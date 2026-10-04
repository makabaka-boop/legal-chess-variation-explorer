import { readable } from 'svelte/store';
import { GameController } from './game/controller';

export const controller = new GameController();

/** 控制器是可变对象，每次操作后 emit，这里重新 set 同一对象以触发 Svelte 更新 */
export const gameStore = readable<GameController>(controller, (set) => {
  return controller.subscribe(() => set(controller));
});
