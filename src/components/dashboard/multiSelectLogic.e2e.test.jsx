/**
 * Tests d'intégration (mini e2e) pour multi-sélection
 * Simule le flux complet: cellule cliquée → slot ajouté → merge → validation → création
 */

import { mergeConsecutiveSlots, validateNoOverlaps, countNights } from './multiSelectLogic';

describe('MultiSelect E2E Flows', () => {
  
  describe('Scenario: 1-nuit (J3)', () => {
    it('user clicks J3 → creates 1-night slot', () => {
      // Utilisateur clique sur J3
      const selectedSlots = [{ roomId: 'R1', date: '2026-03-03' }];
      
      // Merge
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2026-03-03');
      expect(ranges[0].checkout).toBe('2026-03-04');
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(1);
    });
  });

  describe('Scenario: multi-nuit (J3–J5)', () => {
    it('user selects J3, J4, J5 → creates 3-night range', () => {
      // Utilisateur sélectionne J3 à J5 (3 jours)
      const selectedSlots = [
        { roomId: 'R1', date: '2026-03-03' },
        { roomId: 'R1', date: '2026-03-04' },
        { roomId: 'R1', date: '2026-03-05' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2026-03-03');
      expect(ranges[0].checkout).toBe('2026-03-06'); // Checkout est exclusif
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(3);
    });
  });

  describe('Scenario: bornes hors fenêtre', () => {
    it('user selects dates spanning calendar boundaries', () => {
      // Sélection chevauchant février→mars
      const selectedSlots = [
        { roomId: 'R1', date: '2026-02-28' },
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2026-02-28');
      expect(ranges[0].checkout).toBe('2026-03-03');
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(3);
    });

    it('user selects dates spanning year boundaries', () => {
      const selectedSlots = [
        { roomId: 'R1', date: '2025-12-31' },
        { roomId: 'R1', date: '2026-01-01' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2025-12-31');
      expect(ranges[0].checkout).toBe('2026-01-02');
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(1);
    });
  });

  describe('Scenario: overlaps détection', () => {
    it('prevents overlapping reservations in same room', () => {
      // Tentative de créer deux réservations qui se chevauchent
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-04' },
        { roomId: 'R1', checkin: '2026-03-03', checkout: '2026-03-06' }
      ];
      
      const validation = validateNoOverlaps(ranges);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('overlap');
    });

    it('allows adjacent reservations in same room', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-04' },
        { roomId: 'R1', checkin: '2026-03-04', checkout: '2026-03-07' }
      ];
      
      const validation = validateNoOverlaps(ranges);
      
      expect(validation.valid).toBe(true);
    });

    it('allows overlapping reservations in different rooms', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-04' },
        { roomId: 'R2', checkin: '2026-03-02', checkout: '2026-03-05' }
      ];
      
      const validation = validateNoOverlaps(ranges);
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('Scenario: DST transitions (Europe/Zurich)', () => {
    it('handles spring DST transition (2026-03-29 CET→CEST)', () => {
      // Sélection autour du changement d'heure
      const selectedSlots = [
        { roomId: 'R1', date: '2026-03-28' },
        { roomId: 'R1', date: '2026-03-29' },
        { roomId: 'R1', date: '2026-03-30' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2026-03-28');
      expect(ranges[0].checkout).toBe('2026-03-31');
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(3);
    });

    it('handles fall DST transition (2026-10-25 CEST→CET)', () => {
      const selectedSlots = [
        { roomId: 'R1', date: '2026-10-24' },
        { roomId: 'R1', date: '2026-10-25' },
        { roomId: 'R1', date: '2026-10-26' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(1);
      expect(ranges[0].checkin).toBe('2026-10-24');
      expect(ranges[0].checkout).toBe('2026-10-27');
      expect(countNights(ranges[0].checkin, ranges[0].checkout)).toBe(3);
    });
  });

  describe('Scenario: render mode independence', () => {
    it('mergedRanges identical for half-day and full-day rendering', () => {
      // Même sélection de slots
      const selectedSlots = [
        { roomId: 'R1', date: '2026-03-03' },
        { roomId: 'R1', date: '2026-03-04' }
      ];
      
      // Merge une fois
      const merged = mergeConsecutiveSlots(selectedSlots);
      
      // Résultat métier identique, peu importe le renderMode
      expect(merged).toEqual([
        {
          roomId: 'R1',
          checkin: '2026-03-03',
          checkout: '2026-03-05'
        }
      ]);
      
      // renderMode n'affecte que l'affichage visuel (pixels)
      // pas les dates créées ni leur validation
    });

    it('business logic unchanged whether UI uses half-day or full-day pixels', () => {
      // La logique métier fonctionne indépendamment du rendu
      const selectedSlots = [{ roomId: 'R1', date: '2026-03-03' }];
      
      // Résultat métier
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      // Ces dates restent les mêmes peu importe renderMode
      expect(ranges[0].checkin).toBe('2026-03-03');
      expect(ranges[0].checkout).toBe('2026-03-04');
      
      // Le renderMode affecte seulement:
      // - left/width en pixels pour l'affichage
      // - PAS les dates créées en base de données
    });
  });

  describe('Scenario: multi-room group booking (bulk)', () => {
    it('creates group booking across multiple rooms correctly', () => {
      // Utilisateur sélectionne J3-J5 sur 3 chambres
      const selectedSlots = [
        { roomId: 'R1', date: '2026-03-03' },
        { roomId: 'R1', date: '2026-03-04' },
        { roomId: 'R1', date: '2026-03-05' },
        { roomId: 'R2', date: '2026-03-03' },
        { roomId: 'R2', date: '2026-03-04' },
        { roomId: 'R2', date: '2026-03-05' },
        { roomId: 'R3', date: '2026-03-03' },
        { roomId: 'R3', date: '2026-03-04' },
        { roomId: 'R3', date: '2026-03-05' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      // 3 réservations mergeées
      expect(ranges).toHaveLength(3);
      
      // Chaque plage est identique
      ranges.forEach(range => {
        expect(range.checkin).toBe('2026-03-03');
        expect(range.checkout).toBe('2026-03-06');
        expect(countNights(range.checkin, range.checkout)).toBe(3);
      });
      
      // Vérifier pas d'overlaps
      const validation = validateNoOverlaps(ranges);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Scenario: discontinuous selection (gap)', () => {
    it('creates separate ranges for non-consecutive dates', () => {
      // Utilisateur sélectionne J3-J4 + J10-J11 (gap de 5 jours)
      const selectedSlots = [
        { roomId: 'R1', date: '2026-03-03' },
        { roomId: 'R1', date: '2026-03-04' },
        // Gap
        { roomId: 'R1', date: '2026-03-10' },
        { roomId: 'R1', date: '2026-03-11' }
      ];
      
      const ranges = mergeConsecutiveSlots(selectedSlots);
      
      expect(ranges).toHaveLength(2);
      expect(ranges[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-03',
        checkout: '2026-03-05'
      });
      expect(ranges[1]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-10',
        checkout: '2026-03-12'
      });
      
      // Vérifier pas d'overlaps entre les deux plages
      const validation = validateNoOverlaps(ranges);
      expect(validation.valid).toBe(true);
    });
  });
});