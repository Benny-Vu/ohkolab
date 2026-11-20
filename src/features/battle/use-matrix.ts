import { useEffect, useMemo, useState } from "react";

import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";
import type { BattleMatrix, MatrixRequest } from "@/features/battle/matrix";

/**
 * The KO matrix as page state: computed in a web worker so the page never
 * freezes, with a synchronous fallback for environments without workers
 * (jsdom). The worker is created per request — a matrix is only recomputed
 * when a team actually changes, never per keystroke or scroll.
 *
 * The pending state is derived, not stored: a result is "current" when it
 * answers the exact request key, so a stale answer from a superseded team
 * can never be shown while the new one is on its way.
 */

export interface BattleMatrixState {
  /** Null while a team is missing or the matrix is still on its way. */
  matrix: BattleMatrix | null;
  isPending: boolean;
}

interface MatrixResult {
  /** The request this result answers. */
  key: string;
  matrix: BattleMatrix;
}

export function useBattleMatrix(
  mySets: PokemonSet[],
  opponents: OpponentInput[],
  format: BattleFormat,
): BattleMatrixState {
  // A stable request key: the same teams and format always answer to the
  // same string, so an in-flight result is never needlessly superseded.
  const key = useMemo(
    () => JSON.stringify({ mySets, opponents, format }),
    [mySets, opponents, format],
  );
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (mySets.length === 0 || opponents.length === 0) return;

    let cancelled = false;
    let settled = false;
    const request: MatrixRequest = { mySets, opponents, format };

    const finish = (matrix: BattleMatrix) => {
      if (cancelled || settled) return;
      settled = true;
      setResult({ key, matrix });
    };

    /** No answer is coming: stop the skeleton, keep the empty state. */
    const fail = () => {
      if (cancelled || settled) return;
      settled = true;
      setFailure(key);
    };

    /** Without workers (tests, exotic browsers): compute on the main thread. */
    const computeInline = () => {
      void import("@/features/battle/matrix")
        .then(({ computeMatrix }) => {
          finish(computeMatrix(request));
        })
        .catch(fail);
    };

    let worker: Worker | null = null;
    try {
      // A relative URL: Vite bundles this file as the worker's own chunk.
      worker = new Worker(new URL("./matrix-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<BattleMatrix>) => {
        finish(event.data);
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        computeInline();
      };
      worker.postMessage(request);
    } catch {
      worker = null;
      computeInline();
    }

    return () => {
      cancelled = true;
      worker?.terminate();
    };
    // `key` covers the teams and format; the arrays are the request itself.
  }, [key, mySets, opponents, format]);

  if (mySets.length === 0 || opponents.length === 0) {
    return { matrix: null, isPending: false };
  }
  // Only an answer to the exact current request is shown: a matrix for an
  // older team would misalign with the headers, so the page shows the
  // loading skeleton instead of stale numbers.
  if (result?.key === key) {
    return { matrix: result.matrix, isPending: false };
  }
  if (failure === key) {
    return { matrix: null, isPending: false };
  }
  return { matrix: null, isPending: true };
}
