import {
  ArrowRightIcon,
  CalculatorIcon,
  ChartColumnIcon,
  SwordsIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Tool {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TOOLS: Tool[] = [
  {
    to: "/calc",
    title: "Damage calculator",
    description: "Check damage ranges and KO chances with Champions mechanics.",
    icon: CalculatorIcon,
  },
  {
    to: "/teams",
    title: "Team builder",
    description: "Build a team of six, check its type coverage and export it.",
    icon: SwordsIcon,
  },
  {
    to: "/meta",
    title: "Metagame",
    description: "Usage, common sets and speed tiers for singles and doubles.",
    icon: ChartColumnIcon,
  },
];

/**
 * Home screen. The community feed will live here; until it exists the page
 * introduces the tools.
 */
export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Tools and community for Pokémon Champions: calculate damage, build teams
        and follow the metagame.
      </p>

      <ul className="mt-8 grid gap-3">
        {TOOLS.map((tool) => (
          <li key={tool.to}>
            <Link
              to={tool.to}
              className="group block rounded-xl focus-visible:outline-2"
            >
              <Card className="transition-colors group-hover:border-primary/60">
                <CardHeader className="flex flex-row items-center gap-4">
                  <tool.icon
                    className="size-6 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle>{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  <ArrowRightIcon
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground md:hidden">
        OHKOLab is an unofficial fan project, not affiliated with Nintendo, Game
        Freak, Creatures or The Pokémon Company.
      </p>
    </div>
  );
}
