import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { DemoBattleList } from "@/components/demo-battle-list";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { setLocale } from "@/lib/i18n/locale";

registerEnglishDomain("battles", battlesEn);

describe("DemoBattleList", () => {
  it("renders sample requests, each marked as an example", () => {
    render(
      <Providers>
        <DemoBattleList />
      </Providers>,
    );

    // Every sample request carries the example tag.
    expect(screen.getAllByText("Example")).toHaveLength(3);
    expect(screen.getByText("@rikachu")).toBeInTheDocument();
    expect(screen.getByText("Reg M-C, best of 3")).toBeInTheDocument();
    expect(screen.getAllByText("Doubles")).toHaveLength(2);
    expect(screen.getByText("Singles")).toBeInTheDocument();
  });

  it("renders the sample rules and notes in Japanese", () => {
    setLocale("ja");
    try {
      render(
        <Providers>
          <DemoBattleList />
        </Providers>,
      );

      expect(screen.getByText("レギュM-C、3本先取")).toBeInTheDocument();
      expect(screen.getAllByText("ダブル")).toHaveLength(2);
      expect(screen.getByText("シングル")).toBeInTheDocument();
    } finally {
      setLocale("en");
    }
  });

  it("renders no buttons or links", () => {
    render(
      <Providers>
        <DemoBattleList />
      </Providers>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
