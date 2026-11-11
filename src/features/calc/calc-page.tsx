import { ComingSoon } from "@/components/coming-soon";
import { FormatToggle } from "@/components/format-toggle";
import { Page } from "@/components/page";

export function CalcPage() {
  return (
    <Page title="Damage calculator" actions={<FormatToggle />}>
      <ComingSoon>The damage calculator is being built.</ComingSoon>
    </Page>
  );
}
