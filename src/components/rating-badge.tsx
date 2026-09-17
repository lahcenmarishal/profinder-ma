/**
 * Note + nombre d'avis. N'affiche rien tant qu'aucun avis n'existe
 * (pas de « 0.0 », pas d'espace réservé).
 */
export function RatingBadge({
  average,
  count,
  className = "",
}: {
  average: number | string | null | undefined;
  count: number | null | undefined;
  className?: string;
}) {
  const total = Number(count ?? 0);
  if (!total) return null;
  const avg = Number(average ?? 0);
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      <span aria-hidden>⭐</span>
      <span className="tabular-nums">{avg.toFixed(1)}</span>
      <span className="font-medium">
        ({total} avis)
      </span>
    </span>
  );
}
