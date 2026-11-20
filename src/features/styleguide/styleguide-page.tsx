import { ThemeToggle } from "@/components/theme-toggle";
import { Page } from "@/components/page";
import { Logo, LogoMark } from "@/components/logo";
import { Wordmark } from "@/components/wordmark";
import { TypeBadge } from "@/components/type-badge";
import { StatBar } from "@/components/stat-bar";
import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { BigNumber } from "@/components/big-number";
import { SegmentedControl } from "@/components/segmented-control";
import { NumberStepper } from "@/components/number-stepper";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { switchHitClass } from "@/components/touch-targets";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE_NAMES } from "@/types/pokemon";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ name, token }: { name: string; token: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {token}
        </p>
      </div>
    </div>
  );
}

/** Dev-only catalogue of every token and component. */
export function StyleguidePage() {
  return (
    <Page
      title="Styleguide"
      description="Every token and component, both themes, phone first."
      actions={<ThemeToggle />}
    >
      <Section title="Logo and wordmark">
        <div className="flex flex-wrap items-center gap-6">
          <Logo className="text-2xl" />
          <LogoMark className="size-10" />
          <Wordmark className="text-2xl" />
        </div>
      </Section>

      <Section title="Motion tokens">
        <div className="max-w-md space-y-1 font-mono text-xs text-muted-foreground">
          <p>--motion-fast 120ms — hover and press feedback</p>
          <p>--motion-base 160ms — default transitions, page changes</p>
          <p>--motion-slow 240ms — dialogs, sheets, large surfaces</p>
          <p>
            --motion-ease-out entrances · --motion-ease-in-out between two
            visible states
          </p>
          <p>
            Use as duration-(--motion-base) ease-(--motion-ease-out);
            prefers-reduced-motion turns all of it off.
          </p>
        </div>
      </Section>

      <Section title="Colours">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch name="Page" token="--background" />
          <Swatch name="Card" token="--card" />
          <Swatch name="Raised" token="--popover" />
          <Swatch name="Sunken" token="--surface-sunken" />
          <Swatch name="Hairline" token="--border" />
          <Swatch name="Text" token="--foreground" />
          <Swatch name="Muted text" token="--muted-foreground" />
          <Swatch name="Primary" token="--primary" />
          <Swatch name="Accent lime" token="--accent-brand" />
          <Swatch name="Accent hover" token="--accent-brand-hover" />
          <Swatch name="Accent pressed" token="--accent-brand-pressed" />
          <Swatch name="Accent subtle" token="--accent-brand-subtle" />
          <Swatch name="Olive" token="--accent-brand-text" />
          <Swatch name="Destructive" token="--destructive" />
          <Swatch name="Success" token="--success" />
          <Swatch name="Warning" token="--warning" />
          <Swatch name="Info" token="--info" />
          <Swatch name="Damage OHKO" token="--damage-ohko" />
          <Swatch name="Damage 2HKO" token="--damage-2hko" />
          <Swatch name="Damage 3HKO" token="--damage-3hko" />
          <Swatch name="Damage 4HKO" token="--damage-4hko" />
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2">
          <BigNumber size="2xl">72</BigNumber>
          <BigNumber size="xl">56</BigNumber>
          <BigNumber size="lg">40</BigNumber>
          <BigNumber size="md">30</BigNumber>
          <p className="font-heading text-xl font-semibold tracking-tight">
            Heading 20 semibold
          </p>
          <p className="text-base font-medium">Interface 16 medium</p>
          <p className="text-sm">Interface 14 regular</p>
          <p className="text-xs text-muted-foreground">Muted 12 regular</p>
          <p className="font-mono text-sm tabular-nums">
            Mono 14 tabular: 100 / 100
          </p>
        </div>
      </Section>

      <Section title="Type badges">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_NAMES.map((type) => (
            <TypeBadge key={type} type={type} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TYPE_NAMES.slice(0, 6).map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          {/* max-sm:h-11: buttons grow to the 44px phone target
              (design-rules.md: Touch targets); desktop keeps h-8. */}
          <Button className="max-sm:h-11">Primary</Button>
          <Button variant="accent" className="max-sm:h-11">
            Accent
          </Button>
          <Button variant="secondary" className="max-sm:h-11">
            Secondary
          </Button>
          <Button variant="outline" className="max-sm:h-11">
            Outline
          </Button>
          <Button variant="ghost" className="max-sm:h-11">
            Ghost
          </Button>
          <Button variant="destructive" className="max-sm:h-11">
            Destructive
          </Button>
          <Button disabled className="max-sm:h-11">
            Disabled
          </Button>
          <Button loading className="max-sm:h-11">
            Loading
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-3">
          <Input placeholder="Text input" />
          <Input disabled placeholder="Disabled input" />
          <Textarea placeholder="Textarea" rows={3} />
        </div>
      </Section>

      <Section title="Selection controls">
        <div className="flex flex-wrap items-center gap-6">
          <Switch
            aria-label="Switch"
            className={switchHitClass}
            defaultChecked
          />
          <Checkbox
            aria-label="Checkbox"
            className={switchHitClass}
            defaultChecked
          />
          <SegmentedControl
            options={[
              { value: "singles", label: "Singles" },
              { value: "doubles", label: "Doubles" },
            ]}
            value="doubles"
            onValueChange={() => {}}
            aria-label="Format"
          />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="one">
          <TabsList className="max-sm:h-14">
            <TabsTrigger value="one">Singles</TabsTrigger>
            <TabsTrigger value="two">Doubles</TabsTrigger>
            <TabsTrigger value="three">Archive</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Cards">
        <div className="grid max-w-md gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Card body text sits on the card surface with a hairline border.
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Stat bars">
        <div className="max-w-md space-y-3">
          <div>
            <p className="mb-1 text-sm">
              HP <span className="font-mono tabular-nums">16</span> SP
            </p>
            <StatBar value={16} max={32} tone="accent" />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Atk, no SP</p>
            <StatBar value={8} max={32} />
          </div>
        </div>
      </Section>

      <Section title="Damage meter and KO labels">
        <div className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <DamageMeter
              minPercent={30}
              maxPercent={46}
              hpPercent={100}
              size="lg"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">30 to 46 percent</p>
              <KoLabel result="2HKO" />
            </div>
          </div>
          <div className="space-y-1.5">
            <DamageMeter
              minPercent={80}
              maxPercent={96}
              hpPercent={100}
              size="lg"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">80 to 96 percent</p>
              <KoLabel result="OHKO" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <KoLabel result="GUARANTEED 2HKO" />
            <KoLabel result="3HKO" />
            <KoLabel result="4HKO" />
            <KoLabel result="No damage" />
          </div>
        </div>
      </Section>

      <Section title="Number stepper">
        <NumberStepper
          value={16}
          onChange={() => {}}
          label="HP"
          remaining={10}
        />
      </Section>

      <Section title="Empty, error and loading states">
        <div className="grid max-w-md gap-3">
          <EmptyState
            title="No teams yet"
            description="Build your first team to see it here."
            action={
              <Button size="sm" className="max-sm:h-11 max-sm:px-3">
                New team
              </Button>
            }
          />
          <ErrorState
            title="Could not load teams"
            description="Check your connection and try again."
            action={
              <Button
                size="sm"
                variant="outline"
                className="max-sm:h-11 max-sm:px-3"
              >
                Retry
              </Button>
            }
          />
          <div className="space-y-2 rounded-lg border border-dashed border-border p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>
    </Page>
  );
}
