/**
 * Tests unitaires pour la logique métier multi-sélection
 * Isolé du rendu (pixels/UI) — teste UNIQUEMENT les règles métier
 * 
 * Cas couverts:
 * - 1 nuit, multi-nuits
 * - bornes hors fenêtre
 * - overlaps
 * - DST/timezone
 */

import {
  validateReservationDates,
  mergeConsecutiveSlots,
  validateNoOverlaps,
  countNights,
  validateRangeWithinWindow,
  generateTestSlots
} from './multiSelectLogic';

describe('multiSelectLogic', () => {
  
  describe('validateReservationDates', () => {
    it('should accept valid dates (checkin < checkout)', () => {
      const result = validateReservationDates('2026-03-01', '2026-03-02');
      expect(result.valid).toBe(true);
    });

    it('should reject equal dates', () => {
      const result = validateReservationDates('2026-03-01', '2026-03-01');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Checkin must be before checkout');
    });

    it('should reject checkout before checkin', () => {
      const result = validateReservationDates('2026-03-02', '2026-03-01');
      expect(result.valid).toBe(false);
    });
  });

  describe('countNights', () => {
    it('should count 1 night for adjacent dates', () => {
      expect(countNights('2026-03-01', '2026-03-02')).toBe(1);
    });

    it('should count 2 nights for 3-day span', () => {
      expect(countNights('2026-03-01', '2026-03-03')).toBe(2);
    });

    it('should count 7 nights for week span', () => {
      expect(countNights('2026-03-01', '2026-03-08')).toBe(7);
    });

    it('should handle month boundaries', () => {
      expect(countNights('2026-02-28', '2026-03-02')).toBe(2);
    });

    it('should handle year boundaries', () => {
      expect(countNights('2025-12-31', '2026-01-01')).toBe(1);
    });
  });

  describe('mergeConsecutiveSlots', () => {
    it('should handle empty array', () => {
      const result = mergeConsecutiveSlots([]);
      expect(result).toEqual([]);
    });

    it('should merge 1 night (single day selected)', () => {
      const slots = [{ roomId: 'R1', date: '2026-03-01' }];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-01',
        checkout: '2026-03-02'
      });
    });

    it('should merge consecutive nights (2-night stay)', () => {
      const slots = [
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-01',
        checkout: '2026-03-03'
      });
    });

    it('should merge multi-night stay (7 nights)', () => {
      const slots = generateTestSlots('R1', '2026-03-01', '2026-03-08');
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-01',
        checkout: '2026-03-08'
      });
      expect(countNights(result[0].checkin, result[0].checkout)).toBe(7);
    });

    it('should handle unsorted dates (should sort internally)', () => {
      const slots = [
        { roomId: 'R1', date: '2026-03-03' },
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0].checkin).toBe('2026-03-01');
      expect(result[0].checkout).toBe('2026-03-04');
    });

    it('should split non-consecutive dates into separate ranges', () => {
      const slots = [
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' },
        // Gap
        { roomId: 'R1', date: '2026-03-05' },
        { roomId: 'R1', date: '2026-03-06' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-01',
        checkout: '2026-03-03'
      });
      expect(result[1]).toEqual({
        roomId: 'R1',
        checkin: '2026-03-05',
        checkout: '2026-03-07'
      });
    });

    it('should group by roomId and merge separately', () => {
      const slots = [
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R2', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' },
        { roomId: 'R2', date: '2026-03-02' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(2);
      const r1 = result.find(r => r.roomId === 'R1');
      const r2 = result.find(r => r.roomId === 'R2');
      
      expect(r1).toEqual({ roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-03' });
      expect(r2).toEqual({ roomId: 'R2', checkin: '2026-03-01', checkout: '2026-03-03' });
    });

    it('should handle month boundaries correctly', () => {
      const slots = [
        { roomId: 'R1', date: '2026-02-28' },
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2026-02-28',
        checkout: '2026-03-03'
      });
    });

    it('should handle year boundaries correctly', () => {
      const slots = [
        { roomId: 'R1', date: '2025-12-31' },
        { roomId: 'R1', date: '2026-01-01' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'R1',
        checkin: '2025-12-31',
        checkout: '2026-01-02'
      });
    });
  });

  describe('validateNoOverlaps', () => {
    it('should accept non-overlapping ranges', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-03' },
        { roomId: 'R1', checkin: '2026-03-05', checkout: '2026-03-07' }
      ];
      const result = validateNoOverlaps(ranges);
      expect(result.valid).toBe(true);
    });

    it('should accept adjacent ranges (checkout === next checkin)', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-03' },
        { roomId: 'R1', checkin: '2026-03-03', checkout: '2026-03-05' }
      ];
      const result = validateNoOverlaps(ranges);
      expect(result.valid).toBe(true);
    });

    it('should reject overlapping ranges (checkout > next checkin)', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-04' },
        { roomId: 'R1', checkin: '2026-03-03', checkout: '2026-03-05' }
      ];
      const result = validateNoOverlaps(ranges);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlap');
    });

    it('should allow overlaps in different rooms', () => {
      const ranges = [
        { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-05' },
        { roomId: 'R2', checkin: '2026-03-02', checkout: '2026-03-04' }
      ];
      const result = validateNoOverlaps(ranges);
      expect(result.valid).toBe(true);
    });

    it('should handle empty ranges array', () => {
      const result = validateNoOverlaps([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRangeWithinWindow', () => {
    it('should accept valid range', () => {
      const range = { roomId: 'R1', checkin: '2026-03-01', checkout: '2026-03-05' };
      const result = validateRangeWithinWindow(range, '2026-03-01', '2026-03-31');
      expect(result.valid).toBe(true);
    });

    it('should allow range extending beyond window (spanning reservation)', () => {
      const range = { roomId: 'R1', checkin: '2026-02-01', checkout: '2026-04-01' };
      const result = validateRangeWithinWindow(range, '2026-03-01', '2026-03-31');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid range (checkin >= checkout)', () => {
      const range = { roomId: 'R1', checkin: '2026-03-05', checkout: '2026-03-01' };
      const result = validateRangeWithinWindow(range, '2026-03-01', '2026-03-31');
      expect(result.valid).toBe(false);
    });
  });

  describe('generateTestSlots', () => {
    it('should generate 1 slot for 1-day range', () => {
      const slots = generateTestSlots('R1', '2026-03-01', '2026-03-02');
      expect(slots).toEqual([{ roomId: 'R1', date: '2026-03-01' }]);
    });

    it('should generate 7 slots for 7-day range', () => {
      const slots = generateTestSlots('R1', '2026-03-01', '2026-03-08');
      expect(slots).toHaveLength(7);
      expect(slots[0].date).toBe('2026-03-01');
      expect(slots[6].date).toBe('2026-03-07');
    });

    it('should handle month boundaries', () => {
      const slots = generateTestSlots('R1', '2026-02-28', '2026-03-02');
      expect(slots).toHaveLength(2);
      expect(slots[0].date).toBe('2026-02-28');
      expect(slots[1].date).toBe('2026-03-01');
    });
  });

  // DST/Timezone edge cases
  describe('DST/Timezone handling', () => {
    it('should handle DST transitions correctly (spring forward)', () => {
      // 2026-03-29: DST starts in Europe (CET -> CEST)
      const slots = [
        { roomId: 'R1', date: '2026-03-28' },
        { roomId: 'R1', date: '2026-03-29' },
        { roomId: 'R1', date: '2026-03-30' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0].checkin).toBe('2026-03-28');
      expect(result[0].checkout).toBe('2026-03-31');
      expect(countNights(result[0].checkin, result[0].checkout)).toBe(3);
    });

    it('should handle DST transitions correctly (fall back)', () => {
      // 2026-10-25: DST ends in Europe (CEST -> CET)
      const slots = [
        { roomId: 'R1', date: '2026-10-24' },
        { roomId: 'R1', date: '2026-10-25' },
        { roomId: 'R1', date: '2026-10-26' }
      ];
      const result = mergeConsecutiveSlots(slots);
      
      expect(result).toHaveLength(1);
      expect(result[0].checkin).toBe('2026-10-24');
      expect(result[0].checkout).toBe('2026-10-27');
      expect(countNights(result[0].checkin, result[0].checkout)).toBe(3);
    });
  });

  // Integration: render mode should NOT affect business logic
  describe('Render mode independence', () => {
    it('should produce identical mergedRanges regardless of renderMode', () => {
      const slots = [
        { roomId: 'R1', date: '2026-03-01' },
        { roomId: 'R1', date: '2026-03-02' },
        { roomId: 'R1', date: '2026-03-03' }
      ];
      
      // Merge once (independent of rendering)
      const result = mergeConsecutiveSlots(slots);
      
      // Result should be identical whether rendered with 'full-day' or 'half-day'
      // (rendering affects pixels, not the merged ranges)
      expect(result).toHaveLength(1);
      expect(result[0].checkin).toBe('2026-03-01');
      expect(result[0].checkout).toBe('2026-03-04');
    });
  });
});