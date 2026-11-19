import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBirthDate, validateBirthDate } from "@/features/account/birth-date";
import {
  BirthDateField,
  BirthDatePrompt,
} from "@/features/account/birth-date-fields";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import type { AppSupabaseClient } from "@/lib/supabase";
import { setLocale } from "@/lib/i18n/locale";

function fakeClient(birthDate: string | null, rpcError: string | null = null) {
  const calls = {
    from: [] as string[],
    rpc: [] as { fn: string; args: unknown }[],
  };
  const client = {
    from(table: string) {
      calls.from.push(table);
      expect(table).toBe("profile_birth_dates");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({
            data: birthDate === null ? null : { birth_date: birthDate },
            error: null,
          });
        },
      };
    },
    rpc(fn: string, args: unknown) {
      calls.rpc.push({ fn, args });
      return Promise.resolve(
        rpcError === null
          ? { data: null, error: null }
          : { data: null, error: { message: rpcError } },
      );
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

function createWrapper(queryClient: QueryClient, auth: AuthContextValue) {
  return ({ children }: { children?: ReactNode }) =>
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
}

const SIGNED_IN: AuthContextValue = {
  ...GUEST_AUTH,
  isConfigured: true,
  user: { id: "user-1" } as unknown as AuthContextValue["user"],
};

describe("validateBirthDate", () => {
  const t = (key: string) => key;
  const yearsAgo = (years: number) => {
    const date = new Date();
    date.setUTCFullYear(date.getUTCFullYear() - years);
    return date.toISOString().slice(0, 10);
  };

  it("accepts an adult's and a 13-year-old's date", () => {
    expect(validateBirthDate(yearsAgo(20), t)).toBeNull();
    expect(validateBirthDate(yearsAgo(13), t)).toBeNull();
  });

  it("rejects garbage, future dates and under-13", () => {
    expect(validateBirthDate("not-a-date", t)).toBe("birthDate.invalid");
    expect(validateBirthDate("9999-01-01", t)).toBe("birthDate.invalid");
    expect(validateBirthDate(yearsAgo(12), t)).toBe("birthDate.tooYoung");
  });
});

describe("BirthDateField", () => {
  beforeEach(() => {
    setLocale("en");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders nothing and never queries while the flag is off", () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "false");
    const { client, calls } = fakeClient(null);
    render(<BirthDateField client={client} />);
    expect(screen.queryByLabelText("Birth date")).toBeNull();
    expect(calls.rpc).toEqual([]);
  });

  it("saves the chosen date through the RPC", async () => {
    const { client, calls } = fakeClient(null);
    const user = userEvent.setup();
    render(<BirthDateField client={client} />);

    const yearsAgo = new Date();
    yearsAgo.setUTCFullYear(yearsAgo.getUTCFullYear() - 20);
    const date = yearsAgo.toISOString().slice(0, 10);

    await user.type(screen.getByLabelText("Birth date"), date);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(calls.rpc).toEqual([
        { fn: "set_birth_date", args: { new_birth_date: date } },
      ]);
    });
  });

  it("shows the under-13 message without calling the RPC", async () => {
    const { client, calls } = fakeClient(null);
    const user = userEvent.setup();
    render(<BirthDateField client={client} />);

    const yearsAgo = new Date();
    yearsAgo.setUTCFullYear(yearsAgo.getUTCFullYear() - 10);
    await user.type(
      screen.getByLabelText("Birth date"),
      yearsAgo.toISOString().slice(0, 10),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("You must be at least 13 years old."),
    ).toBeInTheDocument();
    expect(calls.rpc).toEqual([]);
  });

  it("shows the server's failure message", async () => {
    const { client } = fakeClient(null, "server says no");
    const user = userEvent.setup();
    render(<BirthDateField client={client} />);

    const yearsAgo = new Date();
    yearsAgo.setUTCFullYear(yearsAgo.getUTCFullYear() - 20);
    await user.type(
      screen.getByLabelText("Birth date"),
      yearsAgo.toISOString().slice(0, 10),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("server says no")).toBeInTheDocument();
    });
  });
});

describe("BirthDatePrompt and useBirthDate", () => {
  beforeEach(() => {
    setLocale("en");
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("renders nothing while the flag is off, with no query", () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "false");
    const { client, calls } = fakeClient(null);
    render(<BirthDatePrompt client={client} />, {
      wrapper: createWrapper(new QueryClient(), SIGNED_IN),
    });
    expect(screen.queryByText("Add your birth date")).toBeNull();
    expect(calls.from).toEqual([]);
  });

  it("asks players without a birth date, and the dismissal sticks", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const { client } = fakeClient(null);
    const view = render(<BirthDatePrompt client={client} />, {
      wrapper: createWrapper(new QueryClient(), SIGNED_IN),
    });

    await waitFor(() => {
      expect(screen.getByText("Add your birth date")).toBeInTheDocument();
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByText("Add your birth date")).toBeNull();
    expect(window.localStorage.getItem("ohkolab.birth-date-dismissed")).toBe(
      "1",
    );

    // Re-rendering the prompt does not bring it back.
    view.unmount();
    render(<BirthDatePrompt client={client} />, {
      wrapper: createWrapper(new QueryClient(), SIGNED_IN),
    });
    expect(screen.queryByText("Add your birth date")).toBeNull();
  });

  it("stays away once a birth date exists", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const { client } = fakeClient("1990-01-01");
    render(<BirthDatePrompt client={client} />, {
      wrapper: createWrapper(new QueryClient(), SIGNED_IN),
    });
    await waitFor(() => {
      expect(screen.queryByText("Add your birth date")).toBeNull();
    });
  });

  it("useBirthDate reads the own row only when enabled", async () => {
    const queryClient = new QueryClient();
    let enabledCase = false;

    function Probe({ client }: { client: AppSupabaseClient }) {
      const birthDate = useBirthDate(client);
      enabledCase = birthDate.data !== undefined;
      return <p>{birthDate.data ?? "none"}</p>;
    }

    vi.stubEnv("VITE_DIRECT_MESSAGES", "false");
    const off = fakeClient(null);
    render(<Probe client={off.client} />, {
      wrapper: createWrapper(queryClient, SIGNED_IN),
    });
    expect(off.calls.from).toEqual([]);
    expect(enabledCase).toBe(false);

    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const on = fakeClient("1990-01-01");
    render(<Probe client={on.client} />, {
      wrapper: createWrapper(new QueryClient(), SIGNED_IN),
    });
    await waitFor(() => {
      expect(screen.getByText("1990-01-01")).toBeInTheDocument();
    });
  });
});
