import { createFileRoute, redirect } from "@tanstack/react-router";

/** Ancienne page Tarifs : conservée en redirection permanente vers « Devenir professeur ». */
export const Route = createFileRoute("/tarifs")({
  beforeLoad: () => {
    throw redirect({ to: "/devenir-professeur" });
  },
});
