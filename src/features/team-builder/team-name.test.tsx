import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { TeamName } from "@/features/team-builder/team-name";

test("shows the naming invite for an untitled team", () => {
  render(<TeamName name="Untitled team" onRename={() => {}} />);

  expect(
    screen.getByRole("button", { name: "Name this team" }),
  ).toBeInTheDocument();
});

test("shows the team name when it has one", () => {
  render(<TeamName name="Vaporize" onRename={() => {}} />);

  expect(screen.getByRole("button", { name: "Vaporize" })).toBeInTheDocument();
});

test("commits a rename on Enter", async () => {
  const user = userEvent.setup();
  const onRename = vi.fn();
  render(<TeamName name="Untitled team" onRename={onRename} />);

  await user.click(screen.getByRole("button", { name: "Name this team" }));
  const input = screen.getByLabelText("Team name");
  await user.clear(input);
  await user.type(input, "Vaporize{Enter}");

  expect(onRename).toHaveBeenCalledWith("Vaporize");
});

test("keeps the old name when editing is cancelled", async () => {
  const user = userEvent.setup();
  const onRename = vi.fn();
  render(<TeamName name="Vaporize" onRename={onRename} />);

  await user.click(screen.getByRole("button", { name: "Vaporize" }));
  const input = screen.getByLabelText("Team name");
  await user.clear(input);
  await user.type(input, "Scrap{Escape}");

  expect(onRename).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Vaporize" })).toBeInTheDocument();
});
