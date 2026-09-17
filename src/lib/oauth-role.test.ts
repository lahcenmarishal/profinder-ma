import { describe, expect, it } from "vitest";
import { resolveOAuthRole } from "@/lib/oauth-role";

describe("resolveOAuthRole", () => {
  it("conserve un compte professeur existant lors d'une connexion normale", () => {
    expect(
      resolveOAuthRole({
        requestedRole: "client",
        knownRole: "client",
        roleWasChosen: false,
        hasProfessionalProfile: true,
      }),
    ).toEqual({ role: "pro", isNewAccount: false });
  });

  it("garde le rôle professeur même si un rôle élève traîne en mémoire", () => {
    expect(
      resolveOAuthRole({
        requestedRole: "client",
        knownRole: "client",
        roleWasChosen: true,
        hasProfessionalProfile: true,
      }),
    ).toEqual({ role: "pro", isNewAccount: false });
  });


  it("respecte le rôle choisi lors d'une inscription explicite", () => {
    expect(
      resolveOAuthRole({
        requestedRole: "pro",
        knownRole: "client",
        roleWasChosen: true,
        hasProfessionalProfile: false,
      }),
    ).toEqual({ role: "pro", isNewAccount: false });
  });

  it("demande le parcours seulement pour un compte réellement nouveau", () => {
    expect(
      resolveOAuthRole({
        requestedRole: "client",
        knownRole: null,
        roleWasChosen: false,
        hasProfessionalProfile: false,
      }),
    ).toEqual({ role: "client", isNewAccount: true });
  });
});