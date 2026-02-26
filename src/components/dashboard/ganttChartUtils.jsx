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

  // Modèle métier: dates réelles (checkin/checkout)
  const checkinDate = new Date(reservation.date_checkin);
  const checkoutDate = new Date(reservation.date_checkout);

  // Trouver indices dans dateColumns
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < dateColumns.length; i++) {
    const col = new Date(dateColumns[i]);
    col.setHours(0, 0, 0, 0);

    if (startIndex === -1 && col.getTime() === checkinDate.getTime()) {
      startIndex = i;
    }
    if (col.getTime() === checkoutDate.getTime()) {
      endIndex = i;
    }
  }

  // Cas: réservation avant/après la vue
  const startsBeforeView = checkinDate < new Date(dateColumns[0]);
  const endsAfterView = checkoutDate > new Date(dateColumns[dateColumns.length - 1]);

  if (startsBeforeView) startIndex = 0;
  if (endsAfterView) endIndex = dateColumns.length - 1;

  // Par défaut si pas trouvé
  if (startIndex === -1) startIndex = 0;
  if (endIndex === -1) endIndex = dateColumns.length - 1;

  // Conversion jours -> pixels selon renderMode
  let left, width;

  if (renderMode === 'half-day') {
    // Ancien comportement: avec HALF_COL_WIDTH décalage
    const HALF_COL_WIDTH = COL_WIDTH / 2;
    if (startsBeforeView) {
      left = startIndex * COL_WIDTH;
    } else {
      left = startIndex * COL_WIDTH + HALF_COL_WIDTH;
    }

    if (endsAfterView) {
      width = endIndex * COL_WIDTH - left;
    } else {
      const endPixel = endIndex * COL_WIDTH + HALF_COL_WIDTH;
      width = endPixel - left;
    }
  } else {
    // renderMode === 'full-day' (par défaut): sans décalage
    left = startIndex * COL_WIDTH;
    width = (endIndex - startIndex) * COL_WIDTH;
  }

  return {
    left: Math.max(0, left),
    width: Math.max(COL_WIDTH / 2, width) // Min width pour visibilité
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