/**
 * Tests pour ganttChartUtils
 * Valide la conversion dates -> pixels et les cas limites
 */

import { getReservationPixels } from './ganttChartUtils';

describe('ganttChartUtils', () => {
  const COL_WIDTH = 120; // Constant used in the utility

  describe('getReservationPixels', () => {
    test('full-day: single day reservation', () => {
      const reservation = {
        date_checkin: '2025-01-01',
        date_checkout: '2025-01-02'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result).toEqual({
        left: 0,
        width: 120 // 1 day = 1 * COL_WIDTH
      });
    });

    test('full-day: 2-day reservation', () => {
      const reservation = {
        date_checkin: '2025-01-01',
        date_checkout: '2025-01-03'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result).toEqual({
        left: 0,
        width: 240 // 2 days = 2 * COL_WIDTH
      });
    });

    test('full-day: reservation starting mid-view', () => {
      const reservation = {
        date_checkin: '2025-01-02',
        date_checkout: '2025-01-03'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3),
        new Date(2025, 0, 4)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result).toEqual({
        left: 120, // Starts at index 1
        width: 120 // 1 day
      });
    });

    test('full-day: reservation spanning beyond view', () => {
      const reservation = {
        date_checkin: '2025-01-01',
        date_checkout: '2025-01-05' // Beyond last column
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      // Should extend to the end of view
      expect(result.left).toBe(0);
      expect(result.width).toBeGreaterThan(240);
    });

    test('full-day: reservation completely before view', () => {
      const reservation = {
        date_checkin: '2024-12-29',
        date_checkout: '2024-12-31'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result).toBeNull();
    });

    test('full-day: reservation completely after view', () => {
      const reservation = {
        date_checkin: '2025-01-05',
        date_checkout: '2025-01-06'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result).toBeNull();
    });

    test('full-day: empty dateColumns', () => {
      const reservation = {
        date_checkin: '2025-01-01',
        date_checkout: '2025-01-02'
      };

      const result = getReservationPixels(reservation, [], 'full-day');
      expect(result).toEqual({ left: 0, width: 60 }); // Min width
    });

    test('full-day: partial overlap at start', () => {
      const reservation = {
        date_checkin: '2024-12-31',
        date_checkout: '2025-01-02'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result.left).toBe(0); // Starts at view boundary
      expect(result.width).toBe(120); // 1 day visible
    });

    test('full-day: partial overlap at end', () => {
      const reservation = {
        date_checkin: '2025-01-02',
        date_checkout: '2025-01-05'
      };
      const dateColumns = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3)
      ];

      const result = getReservationPixels(reservation, dateColumns, 'full-day');
      expect(result.left).toBe(120); // Starts at index 1
      expect(result.width).toBe(240); // 2 days visible
    });
  });
});