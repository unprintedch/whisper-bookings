/**
 * Logique d'interaction UI pour le Gantt
 * ISOLÉE: gestion des clics, sélections, modales
 * NE DÉPEND PAS de pixels/dates directes = pur state management
 */

/**
 * Contexte de sélection multi-slot
 * Gère l'état de la sélection et les opérations associées
 */
export class GanttSelectionManager {
  constructor() {
    this.selectedSlots = []; // [{roomId, date: 'YYYY-MM-DD'}, ...]
    this.selectionMode = 'click'; // 'click' ou 'drag'
  }
  
  /**
   * Ajoute un slot à la sélection (avec toggle si déjà sélectionné)
   */
  addSlot(roomId, date, options = {}) {
    const { toggle = true } = options;
    const dateStr = this._normalizeDateStr(date);
    
    const existingIndex = this.selectedSlots.findIndex(
      s => s.roomId === roomId && s.date === dateStr
    );
    
    if (existingIndex !== -1) {
      if (toggle) {
        // Retirer
        this.selectedSlots.splice(existingIndex, 1);
      }
      return;
    }
    
    // Ajouter
    this.selectedSlots.push({ roomId, date: dateStr });
  }
  
  /**
   * Vide la sélection
   */
  clearSelection() {
    this.selectedSlots = [];
  }
  
  /**
   * Retire un slot spécifique
   */
  removeSlot(roomId, date) {
    const dateStr = this._normalizeDateStr(date);
    this.selectedSlots = this.selectedSlots.filter(
      s => !(s.roomId === roomId && s.date === dateStr)
    );
  }
  
  /**
   * Retourne true si le slot est sélectionné
   */
  isSelected(roomId, date) {
    const dateStr = this._normalizeDateStr(date);
    return this.selectedSlots.some(s => s.roomId === roomId && s.date === dateStr);
  }
  
  /**
   * Retourne les slots sélectionnés pour une chambre
   */
  getSlotsForRoom(roomId) {
    return this.selectedSlots.filter(s => s.roomId === roomId);
  }
  
  /**
   * Retourne l'état de sélection (copie)
   */
  getState() {
    return [...this.selectedSlots];
  }
  
  _normalizeDateStr(date) {
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    throw new Error('Invalid date format');
  }
}

/**
 * Handlers de cellule Gantt
 * Gère les interactions utilisateur (click, etc.)
 */
export const createCellHandlers = (selectionManager, onCellClick) => ({
  handleCellClick: (room, date, event) => {
    event?.stopPropagation?.();
    
    // Ajouter/retirer le slot de la sélection
    selectionManager.addSlot(room.id, date);
    
    // Notifier le composant parent
    if (onCellClick) {
      onCellClick(room, date);
    }
  },
  
  handleCellHover: (room, date) => {
    // Peut être étendu pour drag-and-drop
  }
});

/**
 * Handlers de réservation existante
 * Gère les clics sur les bookings
 */
export const createBookingHandlers = (onBookingEdit) => ({
  handleBookingClick: (reservation, event) => {
    event?.stopPropagation?.();
    if (onBookingEdit) {
      onBookingEdit(reservation);
    }
  }
});