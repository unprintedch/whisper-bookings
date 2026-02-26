/**
 * Utilitaire pur pour convertir plages de réservation en positions visuelles (pixels)
 * Découple complètement la logique métier (dates) du rendu (pixels)
 */

const COL_WIDTH = 120; // Largeur d'une colonne jour en pixels

/**
 * Calcule la position visuelle (left, width) d'une réservation
 * @param {Object} reservation - Objet réservation {date_checkin, date_checkout, ...}
 * @param {Date[]} dateColumns - Array des dates affichées (pour calculer les indices)
 * @param {string} renderMode - 'full-day' ou 'half-day' pour le rendu
 * @returns {Object} {left, width} en pixels
 */
export function getReservationPixels(reservation, dateColumns, renderMode = 'full-day') {
  if (!dateColumns || dateColumns.length === 0) {
    return { left: 0, width: COL_WIDTH / 2 };
  }

  // Normaliser checkin/checkout en UTC minuit uniquement
  const checkinDate = new Date(reservation.date_checkin + 'T00:00:00Z');
  const checkoutDate = new Date(reservation.date_checkout + 'T00:00:00Z');

  // Trouver indices dans dateColumns (normalisés identiquement)
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < dateColumns.length; i++) {
    const col = new Date(dateColumns[i]);
    col.setUTCHours(0, 0, 0, 0);

    if (startIndex === -1 && col.getTime() === checkinDate.getTime()) {
      startIndex = i;
    }
    if (col.getTime() === checkoutDate.getTime()) {
      endIndex = i;
    }
  }

  // Normaliser la première et dernière date colonne pour comparaison
  const viewStartCol = new Date(dateColumns[0]);
  viewStartCol.setUTCHours(0, 0, 0, 0);
  const viewEndCol = new Date(dateColumns[dateColumns.length - 1]);
  viewEndCol.setUTCHours(0, 0, 0, 0);

  const startsBeforeView = checkinDate < viewStartCol;
  const endsAfterView = checkoutDate > viewEndCol;

  if (startsBeforeView) startIndex = 0;
  if (endsAfterView) endIndex = dateColumns.length - 1;

  if (startIndex === -1) startIndex = 0;
  if (endIndex === -1) endIndex = dateColumns.length - 1;

  // Conversion indices -> pixels
  let left = startIndex * COL_WIDTH;
  let width = (endIndex - startIndex) * COL_WIDTH;

  return {
    left: Math.max(0, left),
    width: Math.max(COL_WIDTH / 2, width)
  };
}

/**
 * Formate l'occupancy display (ex: "2A 1C")
 */
export function getOccupancyDisplay(reservation) {
  const adults = reservation.adults_count || 0;
  const children = reservation.children_count || 0;
  const infants = reservation.infants_count || 0;

  return [
    adults > 0 ? `${adults}A` : null,
    children > 0 ? `${children}C` : null,
    infants > 0 ? `${infants}I` : null
  ]
    .filter(Boolean)
    .join(' ');
}