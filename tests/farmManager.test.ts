import { describe, it, expect, beforeEach, vi } from 'vitest';
import { farmManager } from '../utils/farmManager';
import { FarmPlotState } from '../types';
import { inventoryManager } from '../utils/inventoryManager';

// Mock TimeManager
vi.mock('../utils/TimeManager', () => ({
  TimeManager: {
    getCurrentTime: () => ({
      year: 0,
      season: 'Spring',
      day: 1,
      totalDays: 1,
      hour: 12,
      timeOfDay: 'Day',
      totalHours: 36,
    }),
  },
}));

// Mock inventoryManager
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    removeItem: vi.fn((itemId: string, quantity: number) => true),
    hasItem: vi.fn((itemId: string, quantity: number) => true),
    addItem: vi.fn((itemId: string, quantity: number) => {}),
    getInventoryData: vi.fn(() => ({ items: {}, tools: {} })),
  },
}));

describe('FarmManager', () => {
  beforeEach(() => {
    // Clear all plots before each test
    farmManager.loadPlots([]);
    vi.clearAllMocks();
  });

  describe('tillSoil', () => {
    it('should till fallow soil successfully', () => {
      const position = { x: 5, y: 10 };
      const result = farmManager.tillSoil('test_map', position);

      expect(result).toBe(true);

      const plot = farmManager.getPlot('test_map', position);
      expect(plot).toBeDefined();
      expect(plot?.state).toBe(FarmPlotState.TILLED);
      expect(plot?.cropType).toBeNull();
    });

    it('should not till already tilled soil', () => {
      const position = { x: 5, y: 10 };

      // Till once
      farmManager.tillSoil('test_map', position);

      // Try to till again
      const result = farmManager.tillSoil('test_map', position);
      expect(result).toBe(false);
    });

    it('should create plot with correct timestamps', () => {
      const position = { x: 5, y: 10 };
      const beforeTime = Date.now();

      farmManager.tillSoil('test_map', position);

      const afterTime = Date.now();
      const plot = farmManager.getPlot('test_map', position);

      expect(plot?.stateChangedAtTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(plot?.stateChangedAtTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('plantSeed', () => {
    beforeEach(() => {
      // Mock successful seed consumption
      vi.mocked(inventoryManager.removeItem).mockReturnValue(true);
      vi.mocked(inventoryManager.hasItem).mockReturnValue(true);
    });

    it('should plant seed on tilled soil', () => {
      const position = { x: 5, y: 10 };

      // Till soil first
      farmManager.tillSoil('test_map', position);

      // Plant seed
      const result = farmManager.plantSeed('test_map', position, 'radish');

      expect(result).toBe(true);
      expect(inventoryManager.removeItem).toHaveBeenCalledWith('seed_radish', 1);

      const plot = farmManager.getPlot('test_map', position);
      expect(plot?.state).toBe(FarmPlotState.PLANTED);
      expect(plot?.cropType).toBe('radish');
      expect(plot?.plantedAtTimestamp).not.toBeNull();
      expect(plot?.lastWateredTimestamp).not.toBeNull(); // Planting counts as watering
    });

    it('should not plant on untilled soil', () => {
      const position = { x: 5, y: 10 };

      // Try to plant without tilling
      const result = farmManager.plantSeed('test_map', position, 'radish');

      expect(result).toBe(false);
      expect(inventoryManager.removeItem).not.toHaveBeenCalled();
    });

    it('should not plant if no seeds in inventory', () => {
      const position = { x: 5, y: 10 };

      // Till soil
      farmManager.tillSoil('test_map', position);

      // Mock no seeds available
      vi.mocked(inventoryManager.removeItem).mockReturnValue(false);
      vi.mocked(inventoryManager.hasItem).mockReturnValue(false);

      // Try to plant
      const result = farmManager.plantSeed('test_map', position, 'radish');

      expect(result).toBe(false);

      const plot = farmManager.getPlot('test_map', position);
      expect(plot?.state).toBe(FarmPlotState.TILLED); // Still tilled
      expect(plot?.cropType).toBeNull();
    });
  });

  describe('waterPlot', () => {
    beforeEach(() => {
      vi.mocked(inventoryManager.removeItem).mockReturnValue(true);
      vi.mocked(inventoryManager.hasItem).mockReturnValue(true);
    });

    it('should water a planted crop', async () => {
      const position = { x: 5, y: 10 };

      // Till and plant
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish');

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Water the crop
      const result = farmManager.waterPlot('test_map', position);

      expect(result).toBe(true);

      const updatedPlot = farmManager.getPlot('test_map', position);
      expect(updatedPlot?.state).toBe(FarmPlotState.WATERED);
      expect(updatedPlot?.lastWateredTimestamp).toBeGreaterThan(0);
    });

    it('should not water tilled soil', () => {
      const position = { x: 5, y: 10 };

      // Till only
      farmManager.tillSoil('test_map', position);

      // Try to water
      const result = farmManager.waterPlot('test_map', position);

      expect(result).toBe(false);
    });

    it('should be able to water ready crops to keep them healthy', () => {
      const position = { x: 5, y: 10 };

      // Create a ready crop (manually for testing)
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish');

      // Manually set to ready state
      const plot = farmManager.getPlot('test_map', position)!;
      farmManager.loadPlots([{ ...plot, state: FarmPlotState.READY }]);

      // Can water ready crops (to prevent wilting)
      const result = farmManager.waterPlot('test_map', position);

      expect(result).toBe(true);
    });
  });

  describe('harvestCrop', () => {
    beforeEach(() => {
      vi.mocked(inventoryManager.removeItem).mockReturnValue(true);
      vi.mocked(inventoryManager.hasItem).mockReturnValue(true);
    });

    it('should harvest a ready crop', () => {
      const position = { x: 5, y: 10 };

      // Set up ready crop
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish');

      // Manually set to ready
      const plot = farmManager.getPlot('test_map', position)!;
      farmManager.loadPlots([{ ...plot, state: FarmPlotState.READY }]);

      // Harvest
      const result = farmManager.harvestCrop('test_map', position);

      expect(result).not.toBeNull();
      expect(result?.cropId).toBe('radish');
      expect(result?.yield).toBe(1); // Radish yields 1

      // Should add crop AND seeds (1-3 seeds per harvest based on crop definition)
      expect(inventoryManager.addItem).toHaveBeenCalledWith('radish', 1);
      expect(inventoryManager.addItem).toHaveBeenCalledWith('seed_radish', expect.any(Number));

      // Plot should be tilled again
      const updatedPlot = farmManager.getPlot('test_map', position);
      expect(updatedPlot?.state).toBe(FarmPlotState.TILLED);
      expect(updatedPlot?.cropType).toBeNull();
    });

    it('should not harvest unready crops', () => {
      const position = { x: 5, y: 10 };

      // Plant but don't make ready
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish');

      // Try to harvest
      const result = farmManager.harvestCrop('test_map', position);

      expect(result).toBeNull();
      expect(inventoryManager.addItem).not.toHaveBeenCalled();
    });
  });

  describe('clearDeadCrop', () => {
    it('should clear a dead crop', () => {
      const position = { x: 5, y: 10 };

      // Create dead crop
      farmManager.tillSoil('test_map', position);
      const plot = farmManager.getPlot('test_map', position)!;
      farmManager.loadPlots([{
        ...plot,
        state: FarmPlotState.DEAD,
        cropType: 'radish',
      }]);

      // Clear
      const result = farmManager.clearDeadCrop('test_map', position);

      expect(result).toBe(true);

      const updatedPlot = farmManager.getPlot('test_map', position);
      expect(updatedPlot?.state).toBe(FarmPlotState.FALLOW);
      expect(updatedPlot?.cropType).toBeNull();
    });

    it('should not clear non-dead crops', () => {
      const position = { x: 5, y: 10 };

      // Plant crop
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish');

      // Try to clear
      const result = farmManager.clearDeadCrop('test_map', position);

      expect(result).toBe(false);

      const plot = farmManager.getPlot('test_map', position);
      expect(plot?.state).toBe(FarmPlotState.PLANTED); // Still planted
    });
  });

  describe('getTileTypeForPlot', () => {
    beforeEach(() => {
      vi.mocked(inventoryManager.removeItem).mockReturnValue(true);
      vi.mocked(inventoryManager.hasItem).mockReturnValue(true);
    });

    it('should return correct TileType for each state', () => {
      const position = { x: 5, y: 10 };

      // Fallow
      farmManager.loadPlots([{
        mapId: 'test_map',
        position,
        state: FarmPlotState.FALLOW,
        cropType: null,
        plantedAtDay: null,
        plantedAtHour: null,
        lastWateredDay: null,
        lastWateredHour: null,
        stateChangedAtDay: 1,
        stateChangedAtHour: 12,
        plantedAtTimestamp: null,
        lastWateredTimestamp: null,
        stateChangedAtTimestamp: Date.now(),
      }]);
      let plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(26); // SOIL_FALLOW

      // Tilled
      farmManager.tillSoil('test_map', position);
      plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(27); // SOIL_TILLED

      // Planted
      farmManager.plantSeed('test_map', position, 'radish');
      plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(28); // SOIL_PLANTED
    });
  });

  describe('Plot management', () => {
    it('should get all plots', () => {
      farmManager.tillSoil('map1', { x: 1, y: 1 });
      farmManager.tillSoil('map1', { x: 2, y: 2 });
      farmManager.tillSoil('map2', { x: 3, y: 3 });

      const allPlots = farmManager.getAllPlots();
      expect(allPlots.length).toBe(3);
    });

    it('should filter plots by map', () => {
      farmManager.tillSoil('map1', { x: 1, y: 1 });
      farmManager.tillSoil('map1', { x: 2, y: 2 });
      farmManager.tillSoil('map2', { x: 3, y: 3 });

      const map1Plots = farmManager.getPlotsForMap('map1');
      expect(map1Plots.length).toBe(2);

      const map2Plots = farmManager.getPlotsForMap('map2');
      expect(map2Plots.length).toBe(1);
    });

    it('should load plots correctly', () => {
      const plots = [
        {
          mapId: 'test_map',
          position: { x: 1, y: 1 },
          state: FarmPlotState.TILLED,
          cropType: null,
          plantedAtDay: null,
          plantedAtHour: null,
          lastWateredDay: null,
          lastWateredHour: null,
          stateChangedAtDay: 1,
          stateChangedAtHour: 12,
          plantedAtTimestamp: null,
          lastWateredTimestamp: null,
          stateChangedAtTimestamp: Date.now(),
        },
      ];

      farmManager.loadPlots(plots);

      const loadedPlot = farmManager.getPlot('test_map', { x: 1, y: 1 });
      expect(loadedPlot).toBeDefined();
      expect(loadedPlot?.state).toBe(FarmPlotState.TILLED);
    });
  });
});
