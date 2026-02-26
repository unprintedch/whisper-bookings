/**
 * Logique métier PURE pour multi-sélection de slots de réservation
 * Découplée du rendu (pixels/UI) — utilise UNIQUEMENT des dates réelles
 * 
 * Règles métier verrouillées:
 * - Sélection contiguë => merge correct (dates consécutives = même plage)
 * - Checkout = checkin + nuits (exclusif: J3-J5 = 2 nuits, checkout le J5 matin)
 * - DST/timezones gérés avec normalisation stricte
 */

/**
 * Normalise une date ISO string ou Date en objet avec {year, month, day}
 * Garantit pas de timezone drift
 */
function normalizeDate(dateInput) {
  let d;
  if (typeof dateInput === 'string') {
    // Format: 'YYYY-MM-DD'
    const [y, m, da] = dateInput.split('-').map(Number);
    d = new Date(y, m - 1, da, 0, 0, 0, 0);
  } else if (dateInput instanceof Date) {
    d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
  } else {
    throw new Error('Invalid date input');
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    toDate: () => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  };
}

/**
 * Compare deux dates normalisées: -1 (a < b), 0 (a === b), 1 (a > b)
 */
function compareDates(dateA, dateB) {
  const a = normalizeDate(dateA);
  const b = normalizeDate(dateB);
  
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/**
 * Ajoute N jours à une date, normalisation stricte
 */
function addDays(dateInput, days) {
  const norm = normalizeDate(dateInput);
  const result = new Date(norm.year, norm.month - 1, norm.day + days);
  return normalizeDate(result);
}

/**
 * Différence en jours entre deux dates (positif = b après a)
 */
function daysDifference(dateA, dateB) {
  const a = normalizeDate(dateA);
  const b = normalizeDate(dateB);
  
  const msA = new Date(a.year, a.month - 1, a.day).getTime();
  const msB = new Date(b.year, b.month - 1, b.day).getTime();
  
  return Math.round((msB - msA) / (1000 * 60 * 60 * 24));
}

/**
 * Valide qu'une réservation est valide (checkin < checkout)
 */
export function validateReservationDates(checkin, checkout) {
  const cmp = compareDates(checkin, checkout);
  if (cmp >= 0) {
    return { valid: false, error: 'Checkin must be before checkout' };
  }
  return { valid: true };
}

/**
 * Fusionne des slots sélectionnés en plages contiguës
 * 
 * @param {Array} slots - [{roomId, date: 'YYYY-MM-DD'}, ...]
 * @returns {Array} [{roomId, checkin: 'YYYY-MM-DD', checkout: 'YYYY-MM-DD'}, ...]
 * 
 * Règles:
 * - Grouper par roomId
 * - Trier dates
 * - Dates consécutives = même plage
 * - checkout = lastDate + 1 jour (exclusif)
 */
export function mergeConsecutiveSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }

  // Valider tous les slots
  for (const slot of slots) {
    if (!slot.roomId || !slot.date) {
      throw new Error('Each slot must have roomId and date');
    }
  }

  // Grouper par roomId
  const byRoom = {};
  slots.forEach(slot => {
    if (!byRoom[slot.roomId]) byRoom[slot.roomId] = [];
    byRoom[slot.roomId].push(slot.date);
  });

  const merged = [];

  Object.entries(byRoom).forEach(([roomId, dates]) => {
    // Normaliser et trier
    const normalized = dates.map(normalizeDate);
    normalized.sort((a, b) => {
      const cmp = a.year !== b.year ? (a.year - b.year) : (a.month !== b.month ? a.month - b.month : a.day - b.day);
      return cmp;
    });

    // Fusionner consécutifs
    let i = 0;
    while (i < normalized.length) {
      let start = normalized[i];
      let end = normalized[i];
      i++;

      while (i < normalized.length) {
        const curr = normalized[i];
        const diff = daysDifference(end.toDate(), curr.toDate());
        
        // Si diff === 1, dates consécutives
        if (diff === 1) {
          end = curr;
          i++;
        } else {
          break;
        }
      }

      // checkout = end + 1
      const checkoutNorm = addDays(end.toDate(), 1);
      
      merged.push({
        roomId,
        checkin: `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`,
        checkout: `${checkoutNorm.year}-${String(checkoutNorm.month).padStart(2, '0')}-${String(checkoutNorm.day).padStart(2, '0')}`
      });
    }
  });

  return merged;
}

/**
 * Valide qu'un ensemble de plages ne se chevauchent pas
 * (pour une même chambre)
 */
export function validateNoOverlaps(ranges) {
  const byRoom = {};
  
  ranges.forEach(range => {
    if (!byRoom[range.roomId]) byRoom[range.roomId] = [];
    byRoom[range.roomId].push(range);
  });

  for (const [roomId, roomRanges] of Object.entries(byRoom)) {
    roomRanges.sort((a, b) => compareDates(a.checkin, b.checkin));
    
    for (let i = 0; i < roomRanges.length - 1; i++) {
      const curr = roomRanges[i];
      const next = roomRanges[i + 1];
      
      // curr.checkout ne doit pas être >= next.checkin
      if (compareDates(curr.checkout, next.checkin) > 0) {
        return {
          valid: false,
          error: `Room ${roomId}: reservations overlap between ${curr.checkout} and ${next.checkin}`
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Compte le nombre de nuits dans une plage
 */
export function countNights(checkin, checkout) {
  return daysDifference(checkin, checkout);
}

/**
 * Valide les limites d'une plage par rapport à une fenêtre de dates
 */
export function validateRangeWithinWindow(range, windowStart, windowEnd) {
  // Note: range peut déborder windowStart/End (spanning reservations)
  // Juste valider que checkin < checkout
  return validateReservationDates(range.checkin, range.checkout);
}

/**
 * Test helper: génère des slots de test
 */
export function generateTestSlots(roomId, dateStart, dateEnd) {
  const slots = [];
  let current = normalizeDate(dateStart);
  const end = normalizeDate(dateEnd);
  
  while (compareDates(current.toDate(), end.toDate()) < 0) {
    slots.push({
      roomId,
      date: `${current.year}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}`
    });
    current = addDays(current.toDate(), 1);
  }
  
  return slots;
}