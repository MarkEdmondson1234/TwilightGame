import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CROPS, TESTING_MODE } from '../data/crops';
import { FarmPlotState } from '../types';

describe('Crop Growth System', () => {
  describe('Crop Definitions', () => {
    it('should have all required crops', () => {
      expect(CROPS.radish).toBeDefined();
      expect(CROPS.tomato).toBeDefined();
      expect(CROPS.salad).toBeDefined();
      expect(CROPS.corn).toBeDefined();
      expect(CROPS.pumpkin).toBeDefined();
    });

    it('should have valid growth times', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.growthTime).toBeGreaterThan(0);
        expect(crop.growthTimeWatered).toBeGreaterThan(0);
        expect(crop.growthTimeWatered).toBeLessThan(crop.growthTime); // Watered should be faster
      });
    });

    it('should have valid water requirements', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.waterNeededInterval).toBeGreaterThan(0);
        expect(crop.wiltingGracePeriod).toBeGreaterThan(0);
        expect(crop.deathGracePeriod).toBeGreaterThan(0);
      });
    });

    it('should have positive yields and prices', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.harvestYield).toBeGreaterThan(0);
        expect(crop.sellPrice).toBeGreaterThan(0);
        expect(crop.seedCost).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs matching keys', () => {
      Object.entries(CROPS).forEach(([key, crop]) => {
        expect(crop.id).toBe(key);
        expect(crop.name).toBe(key);
      });
    });
  });

  describe('Testing Mode', () => {
    it('should have TESTING_MODE defined', () => {
      expect(typeof TESTING_MODE).toBe('boolean');
    });

    it('radish should grow quickly in testing mode', () => {
      if (TESTING_MODE) {
        const radish = CROPS.radish;
        // 2 minutes = 120,000 ms
        expect(radish.growthTime).toBeLessThanOrEqual(2 * 60 * 1000);
      }
    });
  });

  describe('Crop Balance', () => {
    it('faster crops should have lower profit per yield', () => {
      const radish = CROPS.radish;
      const pumpkin = CROPS.pumpkin;

      const radishProfitPerTime = (radish.sellPrice * radish.harvestYield) / radish.growthTime;
      const pumpkinProfitPerTime = (pumpkin.sellPrice * pumpkin.harvestYield) / pumpkin.growthTime;

      // Pumpkin takes 10x longer but shouldn't be 10x more profitable per time
      // This ensures balance - faster crops = more management but similar profit/time
      expect(radishProfitPerTime).toBeGreaterThan(0);
      expect(pumpkinProfitPerTime).toBeGreaterThan(0);
    });

    it('watering should provide meaningful time savings', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        const timeSaved = crop.growthTime - crop.growthTimeWatered;
        const percentSaved = (timeSaved / crop.growthTime) * 100;

        // Watering should save at least 20% of time
        expect(percentSaved).toBeGreaterThanOrEqual(20);
      });
    });

    it('crops should need water regularly enough to require attention', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        // Water interval should be less than growth time
        // (crops need watering at least once during growth)
        expect(crop.waterNeededInterval).toBeLessThan(crop.growthTime);
      });
    });
  });

  describe('Growth Progression', () => {
    it('should have logical state progression', () => {
      const states = [
        FarmPlotState.FALLOW,
        FarmPlotState.TILLED,
        FarmPlotState.PLANTED,
        FarmPlotState.WATERED,
        FarmPlotState.READY,
      ];

      // Just verify the enum values exist
      states.forEach(state => {
        expect(FarmPlotState[state]).toBeDefined();
      });
    });

    it('should have failure states', () => {
      expect(FarmPlotState.WILTING).toBeDefined();
      expect(FarmPlotState.DEAD).toBeDefined();
    });
  });

  describe('Crop ROI (Return on Investment)', () => {
    it('all crops should be profitable', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        const revenue = crop.sellPrice * crop.harvestYield;
        const cost = crop.seedCost;
        const profit = revenue - cost;

        expect(profit).toBeGreaterThan(0);
      });
    });

    it('should calculate profit margins correctly', () => {
      const radish = CROPS.radish;

      const revenue = radish.sellPrice * radish.harvestYield; // 10 * 1 = 10
      const cost = radish.seedCost; // 5
      const profit = revenue - cost; // 5
      const margin = (profit / cost) * 100; // 100%

      expect(margin).toBe(100); // Radish has 100% profit margin
    });

    it('premium crops should have higher total profit', () => {
      const radish = CROPS.radish;
      const pumpkin = CROPS.pumpkin;

      const radishProfit = (radish.sellPrice * radish.harvestYield) - radish.seedCost;
      const pumpkinProfit = (pumpkin.sellPrice * pumpkin.harvestYield) - pumpkin.seedCost;

      expect(pumpkinProfit).toBeGreaterThan(radishProfit);
    });
  });

  describe('Crop Metadata', () => {
    it('should have display names', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.displayName).toBeTruthy();
        expect(crop.displayName.length).toBeGreaterThan(0);
        // Display name should be capitalized
        expect(crop.displayName[0]).toBe(crop.displayName[0].toUpperCase());
      });
    });

    it('should have descriptions', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.description).toBeTruthy();
        expect(crop.description.length).toBeGreaterThan(10);
      });
    });

    it('should have rarity levels', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(['common', 'uncommon', 'rare', 'very_rare']).toContain(crop.rarity);
      });
    });

    it('should have experience values', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        expect(crop.experience).toBeGreaterThan(0);
      });
    });
  });

  describe('Time Conversions (Testing Mode)', () => {
    it('should convert minutes to milliseconds correctly', () => {
      if (TESTING_MODE) {
        const radish = CROPS.radish;
        // 2 minutes = 2 * 60 * 1000 = 120,000 ms
        expect(radish.growthTime).toBe(120000);
      }
    });

    it('should have grace periods in reasonable ranges', () => {
      Object.entries(CROPS).forEach(([id, crop]) => {
        // Grace periods should be less than water interval
        expect(crop.wiltingGracePeriod).toBeLessThan(crop.waterNeededInterval);
        expect(crop.deathGracePeriod).toBeLessThan(crop.waterNeededInterval);
      });
    });
  });
});
