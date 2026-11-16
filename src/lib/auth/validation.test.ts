import { describe, expect, it } from "vitest";

import {
  AVATAR_SPECIES_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeEmail,
  normalizeOptionalText,
  normalizeUsername,
  validateAvatarSpecies,
  validateBio,
  validateCurrentPassword,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validateUsername,
} from "@/lib/auth/validation";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  AshKetchum  ")).toBe("ashketchum");
  });
});

describe("validateUsername", () => {
  it("accepts lowercase letters, digits and underscores", () => {
    expect(validateUsername("ash")).toBeNull();
    expect(validateUsername("a_b_1")).toBeNull();
    expect(validateUsername("x".repeat(USERNAME_MIN_LENGTH))).toBeNull();
    expect(validateUsername("x".repeat(USERNAME_MAX_LENGTH))).toBeNull();
  });

  it("asks for a username when it is empty", () => {
    expect(validateUsername("")).toBe("Choose a username.");
  });

  it("rejects a username below the minimum length", () => {
    expect(validateUsername("x".repeat(USERNAME_MIN_LENGTH - 1))).toBe(
      "Username must be at least 3 characters.",
    );
  });

  it("rejects a username above the maximum length", () => {
    expect(validateUsername("x".repeat(USERNAME_MAX_LENGTH + 1))).toBe(
      "Username must be at most 20 characters.",
    );
  });

  it("rejects characters outside the pattern", () => {
    const message =
      "Username can only contain lowercase letters, digits and underscores.";
    expect(validateUsername("Ash")).toBe(message);
    expect(validateUsername("ash ketchum")).toBe(message);
    expect(validateUsername("ash-1")).toBe(message);
    expect(validateUsername("ash!")).toBe(message);
  });
});

describe("normalizeOptionalText", () => {
  it("trims and keeps non-empty text", () => {
    expect(normalizeOptionalText("  Ash  ")).toBe("Ash");
    expect(normalizeOptionalText("Ash")).toBe("Ash");
  });

  it("turns missing or blank input into null", () => {
    expect(normalizeOptionalText(null)).toBeNull();
    expect(normalizeOptionalText(undefined)).toBeNull();
    expect(normalizeOptionalText("")).toBeNull();
    expect(normalizeOptionalText("   ")).toBeNull();
  });
});

describe("validateDisplayName", () => {
  it("accepts null and anything up to the limit", () => {
    expect(validateDisplayName(null)).toBeNull();
    expect(validateDisplayName("")).toBeNull();
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH))).toBeNull();
  });

  it("rejects a longer display name", () => {
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toBe(
      "Display name must be at most 40 characters.",
    );
  });
});

describe("validateBio", () => {
  it("accepts null and anything up to the limit", () => {
    expect(validateBio(null)).toBeNull();
    expect(validateBio("x".repeat(BIO_MAX_LENGTH))).toBeNull();
  });

  it("rejects a longer bio", () => {
    expect(validateBio("x".repeat(BIO_MAX_LENGTH + 1))).toBe(
      "Bio must be at most 300 characters.",
    );
  });
});

describe("validateAvatarSpecies", () => {
  it("accepts null and anything up to the limit", () => {
    expect(validateAvatarSpecies(null)).toBeNull();
    expect(validateAvatarSpecies("Garchomp")).toBeNull();
    expect(
      validateAvatarSpecies("x".repeat(AVATAR_SPECIES_MAX_LENGTH)),
    ).toBeNull();
  });

  it("rejects a longer species name", () => {
    expect(
      validateAvatarSpecies("x".repeat(AVATAR_SPECIES_MAX_LENGTH + 1)),
    ).toBe("That Pokémon cannot be used as an avatar.");
  });
});

describe("normalizeEmail", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  ash@example.com  ")).toBe("ash@example.com");
  });
});

describe("validateEmail", () => {
  it("accepts email shapes", () => {
    expect(validateEmail("ash@example.com")).toBeNull();
    expect(validateEmail("a.b+c@sub.example.com")).toBeNull();
  });

  it("asks for an email address when it is empty", () => {
    expect(validateEmail("")).toBe("Enter your email address.");
  });

  it("rejects malformed addresses", () => {
    const message = "Enter a valid email address.";
    expect(validateEmail("plainstring")).toBe(message);
    expect(validateEmail("ash@")).toBe(message);
    expect(validateEmail("ash@example")).toBe(message);
    expect(validateEmail("ash @example.com")).toBe(message);
    expect(validateEmail("ash@@example.com")).toBe(message);
  });
});

describe("validateCurrentPassword", () => {
  it("only checks that something was typed", () => {
    expect(validateCurrentPassword("")).toBe("Enter your password.");
    expect(validateCurrentPassword("x")).toBeNull();
  });
});

describe("validateNewPassword", () => {
  it("asks for a password when it is empty", () => {
    expect(validateNewPassword("")).toBe("Choose a password.");
  });

  it("enforces the minimum length", () => {
    expect(validateNewPassword("x".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
      "Password must be at least 8 characters.",
    );
    expect(validateNewPassword("x".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it("enforces the maximum length in bytes, not characters", () => {
    expect(validateNewPassword("x".repeat(PASSWORD_MAX_LENGTH))).toBeNull();
    expect(validateNewPassword("x".repeat(PASSWORD_MAX_LENGTH + 1))).toBe(
      "Password must be at most 72 characters.",
    );
    // Two bytes per character: 36 are fine, 37 are not.
    expect(validateNewPassword("é".repeat(36))).toBeNull();
    expect(validateNewPassword("é".repeat(37))).toBe(
      "Password must be at most 72 characters.",
    );
  });
});
