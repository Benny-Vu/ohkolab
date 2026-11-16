import { useMemo } from "react";
import { ArrowLeftRightIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { FormatToggle } from "@/components/format-toggle";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldPanel } from "@/features/calc/field-panel";
import { ResultsPanel } from "@/features/calc/results-panel";
import { SidePanel } from "@/features/calc/side-panel";
import { useCalcState } from "@/features/calc/use-calc-state";
import { useIsWide } from "@/features/calc/use-is-wide";
import { computeAllOutcomes } from "@/lib/calc/results";
import { SIDE_LABELS } from "@/lib/calc/state";
import { useBattleFormat } from "@/lib/preferences";

export function CalcPage() {
  const [state, dispatch] = useCalcState();
  const [format] = useBattleFormat();
  const isWide = useIsWide();
  const outcomes = useMemo(
    () => computeAllOutcomes(state, format),
    [state, format],
  );

  function handleReset() {
    const previous = state;
    dispatch({ type: "reset" });
    toast("Calculator reset", {
      action: {
        label: "Undo",
        onClick: () => dispatch({ type: "restore", state: previous }),
      },
    });
  }

  return (
    <Page
      title="Damage calculator"
      actions={
        <>
          <FormatToggle />
          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: "swapSides" })}
          >
            <ArrowLeftRightIcon /> Swap sides
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcwIcon /> Reset
          </Button>
        </>
      }
    >
      {isWide ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SidePanel side="p1" calcSide={state.sides.p1} dispatch={dispatch} />
          <SidePanel side="p2" calcSide={state.sides.p2} dispatch={dispatch} />
          <FieldPanel state={state} format={format} dispatch={dispatch} />
          <ResultsPanel state={state} outcomes={outcomes} dispatch={dispatch} />
        </div>
      ) : (
        <div className="grid gap-4">
          <Tabs defaultValue="p1">
            <TabsList className="w-full">
              <TabsTrigger value="p1">{SIDE_LABELS.p1}</TabsTrigger>
              <TabsTrigger value="p2">{SIDE_LABELS.p2}</TabsTrigger>
              <TabsTrigger value="field">Field</TabsTrigger>
            </TabsList>
            <TabsContent value="p1">
              <SidePanel
                side="p1"
                calcSide={state.sides.p1}
                dispatch={dispatch}
              />
            </TabsContent>
            <TabsContent value="p2">
              <SidePanel
                side="p2"
                calcSide={state.sides.p2}
                dispatch={dispatch}
              />
            </TabsContent>
            <TabsContent value="field">
              <FieldPanel state={state} format={format} dispatch={dispatch} />
            </TabsContent>
          </Tabs>
          <ResultsPanel state={state} outcomes={outcomes} dispatch={dispatch} />
        </div>
      )}
    </Page>
  );
}
