/**
 * Configuration des modes de rendu Gantt
 * Chaque mode définit clairement comment les réservations se positionnent visuellement
 * DÉCOUPLÉ COMPLÈTEMENT de la logique métier (dates, merge, etc.)
 */

const COLUMN_WIDTH = 120; // Largeur d'une colonne jour en pixels

/**
 * Mode 'full-day': Réservation occupe les jours entiers de checkin à (checkout - 1)
 * - Checkin = début du jour (bordure gauche du jour)
 * - Checkout = début du jour suivant (bordure droite du jour précédent)
 * - Exemple: checkin 2025-01-05, checkout 2025-01-07 = jours 5, 6 (2 nuits)
 */
export const FULL_DAY_MODE = {
  name: 'full-day',
  description: 'Full day blocks: checkin to checkout-1',
  
  /**
   * Calcule la position visuelle (left, width) en pixels
   * @param {Object} reservation - {date_checkin, date_checkout}
   * @param {Date[]} dateColumns - Colonnes de dates affichées
   * @returns {{left: number, width: number}}
   */
  calculatePixels(reservation, dateColumns) {
    const { startIndex, endIndex } = this._findIndices(reservation, dateColumns);
    
    const left = startIndex * COLUMN_WIDTH;
    const width = Math.max((endIndex - startIndex + 1), 0.5) * COLUMN_WIDTH;
    
    return { left, width };
  },
  
  _findIndices(reservation, dateColumns) {
    const checkin = this._normalizeDate(reservation.date_checkin);
    const checkout = this._normalizeDate(reservation.date_checkout);
    
    const viewStart = this._normalizeDate(dateColumns[0]);
    const viewEnd = this._normalizeDate(dateColumns[dateColumns.length - 1]);
    
    let startIndex = -1;
    let endIndex = -1;
    
    // Chercher l'index exact du checkin
    for (let i = 0; i < dateColumns.length; i++) {
      const col = this._normalizeDate(dateColumns[i]);
      if (col.getTime() === checkin.getTime()) {
        startIndex = i;
        break;
      }
    }
    
    // Chercher l'index exact du checkout - 1 (dernier jour de la réservation)
    const lastDay = new Date(checkout);
    lastDay.setDate(lastDay.getDate() - 1);
    const lastDayNorm = this._normalizeDate(lastDay);
    
    for (let i = 0; i < dateColumns.length; i++) {
      const col = this._normalizeDate(dateColumns[i]);
      if (col.getTime() === lastDayNorm.getTime()) {
        endIndex = i;
        break;
      }
    }
    
    // Gestion des réservations qui dépassent la vue
    if (checkin < viewStart) startIndex = 0;
    if (checkout > viewEnd) endIndex = dateColumns.length - 1;
    
    // Fallback si pas trouvé
    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1) endIndex = Math.min(startIndex + 1, dateColumns.length - 1);
    
    return { startIndex, endIndex };
  },
  
  _normalizeDate(dateInput) {
    const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00Z') : new Date(dateInput);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
};

/**
 * Mode 'half-day': Checkin = mi-jour, Checkout = mi-jour
 * Utilisé si on veut montrer des check-in/out en milieu de journée
 */
export const HALF_DAY_MODE = {
  name: 'half-day',
  description: 'Half-day positioning: checkin at 0.5 col, checkout at 0.5 col',
  
  calculatePixels(reservation, dateColumns) {
    const { startIndex, endIndex, startOffset, endOffset } = this._findIndices(reservation, dateColumns);
    
    const left = startIndex * COLUMN_WIDTH + startOffset * COLUMN_WIDTH;
    const width = Math.max((endIndex - startIndex + 1) * COLUMN_WIDTH - (startOffset + (1 - endOffset)) * COLUMN_WIDTH, COLUMN_WIDTH / 2);
    
    return { left, width };
  },
  
  _findIndices(reservation, dateColumns) {
    const checkin = this._normalizeDate(reservation.date_checkin);
    const checkout = this._normalizeDate(reservation.date_checkout);
    
    let startIndex = 0;
    let endIndex = dateColumns.length - 1;
    let startOffset = 0.5; // Checkin en mi-jour
    let endOffset = 0.5;   // Checkout en mi-jour
    
    for (let i = 0; i < dateColumns.length; i++) {
      const col = this._normalizeDate(dateColumns[i]);
      if (col.getTime() === checkin.getTime()) {
        startIndex = i;
        break;
      }
    }
    
    const checkoutMinusOne = new Date(checkout);
    checkoutMinusOne.setDate(checkoutMinusOne.getDate() - 1);
    const checkoutMinusOneNorm = this._normalizeDate(checkoutMinusOne);
    
    for (let i = 0; i < dateColumns.length; i++) {
      const col = this._normalizeDate(dateColumns[i]);
      if (col.getTime() === checkoutMinusOneNorm.getTime()) {
        endIndex = i;
        break;
      }
    }
    
    return { startIndex, endIndex, startOffset, endOffset };
  },
  
  _normalizeDate(dateInput) {
    const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00Z') : new Date(dateInput);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
};

/**
 * Sélectionne le mode de rendu
 * @param {string} mode - 'full-day' ou 'half-day'
 * @returns {Object} Mode configuré
 */
export function getRenderMode(mode = 'full-day') {
  if (mode === 'half-day') return HALF_DAY_MODE;
  return FULL_DAY_MODE;
}

export { COLUMN_WIDTH };