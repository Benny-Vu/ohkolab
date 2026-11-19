import { useEffect, useReducer, type Dispatch } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { calcReducer, type CalcAction, type CalcState } from "@/lib/calc/state";
import {
  CALC_SHARE_PARAM,
  decodeCalcShareSearch,
  hasCalcShareParam,
} from "@/lib/calc/share-url";
import { loadCalcState, parseHandoff, saveCalcState } from "@/lib/calc/storage";
import { setBattleFormat } from "@/lib/preferences";
import { useT } from "@/lib/i18n/t";

/**
 * The saved state, with anything the navigation handed over loaded on top: a
 * shared calc link (`?c=...`) wins, then sets passed through router state,
 * then local storage. The share link's format becomes the active one, since
 * the numbers it restores are only true in that format.
 */
function initialState(routerState: unknown, search: string): CalcState {
  const shared = decodeCalcShareSearch(search);
  if (shared) {
    setBattleFormat(shared.format);
    return shared.state;
  }
  const stored = loadCalcState();
  const handoff = parseHandoff(routerState);
  return handoff
    ? calcReducer(stored, { type: "loadSets", sets: handoff })
    : stored;
}

/**
 * The calculator state: restored from a shared link, local storage or a
 * handoff, saved on every change, and reset with a toast when the link it
 * was opened from cannot be read.
 */
export function useCalcState(): [CalcState, Dispatch<CalcAction>] {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const [state, dispatch] = useReducer(
    calcReducer,
    location.state,
    (routerState) => initialState(routerState, location.search),
  );

  useEffect(() => {
    saveCalcState(state);
  }, [state]);

  // A share link that cannot be decoded falls back to the saved state; say
  // so once, then drop the parameter so refreshing does not toast again.
  const hasShareParam = hasCalcShareParam(location.search);
  useEffect(() => {
    if (hasShareParam && !decodeCalcShareSearch(location.search)) {
      toast(t("calc.shareLinkInvalid"));
    }
  }, [hasShareParam, location.search, t]);

  // A handoff or share link is used once: drop it from the history entry so
  // that a refresh restores the saved state instead of loading the same
  // sets over it. Other query parameters stay untouched.
  const hasHandoff = parseHandoff(location.state) !== null;
  const { pathname, search, hash } = location;
  useEffect(() => {
    if (!hasHandoff && !hasShareParam) return;
    const kept = new URLSearchParams(search);
    kept.delete(CALC_SHARE_PARAM);
    void navigate(
      { pathname, search: kept.toString(), hash },
      { replace: true, state: null },
    );
  }, [hasHandoff, hasShareParam, navigate, pathname, search, hash]);

  return [state, dispatch];
}
