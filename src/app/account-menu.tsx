import { Link, NavLink } from "react-router";
import { LogInIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";

import { PokemonSprite } from "@/components/pokemon-sprite";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  /** "header" for the desktop header, "tab" for the phone tab bar. */
  variant: "header" | "tab";
}

/** The user's avatar species as a small chip, or a muted fallback. */
function AvatarChip({
  species,
  spriteSize,
  boxClassName,
}: {
  species: string | null;
  spriteSize: number;
  boxClassName: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-content-center overflow-hidden bg-muted",
        boxClassName,
      )}
    >
      {species ? (
        <PokemonSprite species={species} size={spriteSize} />
      ) : (
        <UserRoundIcon aria-hidden className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}

/** Account entry for the header and the phone tab bar. */
export function AccountMenu({ variant }: AccountMenuProps) {
  const auth = useAuth();

  async function handleSignOut() {
    const result = await auth.signOut();
    if (result.ok) {
      toast.success("Signed out.");
    } else {
      toast.error(result.error.message);
    }
  }

  if (auth.loading) {
    return variant === "header" ? (
      <span aria-hidden className="grid size-8 place-content-center">
        <span className="size-6 animate-pulse rounded-md bg-muted" />
      </span>
    ) : (
      <span
        aria-hidden
        className="flex h-full flex-col items-center justify-center gap-0.5"
      >
        <span className="size-5 animate-pulse rounded-full bg-muted" />
        <span className="h-2.5 w-8 animate-pulse rounded bg-muted" />
      </span>
    );
  }

  if (!auth.user) {
    if (variant === "header") {
      return (
        <Button variant="ghost" asChild>
          <Link to="/login">
            <LogInIcon aria-hidden />
            Sign in
          </Link>
        </Button>
      );
    }
    return (
      <NavLink
        to="/login"
        className={({ isActive }) =>
          cn(
            "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
            isActive && "text-primary",
          )
        }
      >
        <LogInIcon aria-hidden className="size-5" />
        Sign in
      </NavLink>
    );
  }

  const profile = auth.profile;

  return (
    <DropdownMenu>
      {variant === "header" ? (
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <AvatarChip
              species={profile?.avatarSpecies ?? null}
              spriteSize={20}
              boxClassName="size-6 rounded-md"
            />
          </Button>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground aria-expanded:text-primary"
        >
          <AvatarChip
            species={profile?.avatarSpecies ?? null}
            spriteSize={16}
            boxClassName="size-5 rounded-full"
          />
          <span className="max-w-full truncate">
            {profile ? profile.username : "Profile"}
          </span>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align="end"
        side={variant === "tab" ? "top" : undefined}
        className="w-56"
      >
        <DropdownMenuLabel className="truncate">
          {profile ? (profile.displayName ?? profile.username) : "Account"}
        </DropdownMenuLabel>
        {profile && (
          <DropdownMenuItem asChild>
            <Link to={`/u/${profile.username}`}>Public page</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void handleSignOut();
          }}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
