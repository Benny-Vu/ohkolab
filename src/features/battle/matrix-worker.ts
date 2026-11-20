import { computeMatrix, type MatrixRequest } from "@/features/battle/matrix";
import type { BattleMatrix } from "@/features/battle/matrix";

/**
 * The matrix worker: the page hands it the two teams and the format, it
 * answers with the whole KO matrix. All Pokémon maths (the dex, the calc
 * library) is bundled with this worker, so 36+ pair calculations never block
 * the page. `useBattleMatrix` is the only creator of this worker, and it
 * only loads with the lazy `/calc/battle` page.
 */

interface WorkerContext {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<MatrixRequest>) => void,
  ): void;
  postMessage(message: BattleMatrix): void;
}

const ctx = self as unknown as WorkerContext;

ctx.addEventListener("message", (event) => {
  ctx.postMessage(computeMatrix(event.data));
});
