import { ComingSoon } from "@/components/coming-soon";
import { FormatToggle } from "@/components/format-toggle";
import { Page } from "@/components/page";

export function MetagamePage() {
  return (
    <Page title="Metagame" actions={<FormatToggle />}>
      <ComingSoon>The metagame section is being built.</ComingSoon>
    </Page>
  );
}
