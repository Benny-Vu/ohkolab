import { useEffect, useReducer, type Dispatch } from "react";
import { useLocation, useNavigate } from "react-router";

import { calcReducer, type CalcAction, type CalcState } from "@/lib/calc/state";
import { loadCalcState, parseHandoff, saveCalcState } from "@/lib/calc/storage";

/** The saved state, with any sets another page handed over loaded on top. */
function initialState(routerState: unknown): CalcState {
  const stored = loadCalcState();
  const handoff = parseHandoff(routerState);
  return handoff
    ? calcReducer(stored, { type: "loadSets", sets: handoff })
    : stored;
}

/**
 * The calculator state: restored from local storage, saved on every change,
 * and preloaded from router state shaped like `CalcHandoff`.
 */
export function useCalcState(): [CalcState, Dispatch<CalcAction>] {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(
    calcReducer,
    location.state,
    initialState,
  );

  useEffect(() => {
    saveCalcState(state);
  }, [state]);

  // A handoff is used once: drop it from the history entry so that a refresh
  // restores the saved state instead of loading the same sets over it.
  const hasHandoff = parseHandoff(location.state) !== null;
  const { pathname, search, hash } = location;
  useEffect(() => {
    if (hasHandoff) {
      void navigate({ pathname, search, hash }, { replace: true, state: null });
    }
  }, [hasHandoff, navigate, pathname, search, hash]);

  return [state, dispatch];
}
