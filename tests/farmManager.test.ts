/**
 * @vitest-environment node
 *
 * Uses node environment to avoid jsdom compatibility issues with webidl-conversions.
 * The farmManager module has browser dependencies through its import chain,
 * so we mock those modules to test the core logic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock constants - use importOriginal to get real values, only override what's needed
vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    // Override import.meta.env dependent values
    DEBUG: {
      FARM: false,
      NPC: false,
      MAP: false,
      COLLISION: false,
    },
  };
});

// Must import after mocks are set up
import { farmManager } from '../utils/farmManager';
import { FarmPlotState, FarmPlot, TileType } from '../types';
import { inventoryManager } from '../utils/inventoryManager';

// Mock TimeManager with Season enum
vi.mock('../utils/TimeManager', () => ({
  Season: {
    SPRING: 'Spring',
    SUMMER: 'Summer',
    AUTUMN: 'Autumn',
    WINTER: 'Winter',
  },
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
      const result = farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

      expect(result.success).toBe(true);
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
      const result = farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

      expect(result.success).toBe(false);
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
      const result = farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

      expect(result.success).toBe(false);

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
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Water the crop
      const result = farmManager.waterPlot('test_map', position);

      expect(result).toBe(true);

      const updatedPlot = farmManager.getPlot('test_map', position);
      expect(updatedPlot?.state).toBe(FarmPlotState.WATERED);
      expect(updatedPlot?.lastWateredTimestamp).toBeGreaterThan(0);
    });

    it('should allow watering tilled soil (pre-moisten)', () => {
      const position = { x: 5, y: 10 };

      // Till only
      farmManager.tillSoil('test_map', position);

      // Water tilled soil — valid since pre-moistening was added
      const result = farmManager.waterPlot('test_map', position);

      expect(result).toBe(true);

      // State should remain TILLED (not change to WATERED)
      const plot = farmManager.getPlot('test_map', position);
      expect(plot?.state).toBe(FarmPlotState.TILLED);
    });

    it('should be able to water ready crops to keep them healthy', () => {
      const position = { x: 5, y: 10 };

      // Create a ready crop (manually for testing)
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

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
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

      // Manually set to ready
      const plot = farmManager.getPlot('test_map', position)!;
      farmManager.loadPlots([{ ...plot, state: FarmPlotState.READY }]);

      // Harvest
      const result = farmManager.harvestCrop('test_map', position);

      expect(result).not.toBeNull();
      expect(result?.cropId).toBe('radish');
      expect(result?.yield).toBe(1); // Radish yields 1

      // Should add crop AND seeds (1-3 seeds per harvest based on crop definition)
      expect(inventoryManager.addItem).toHaveBeenCalledWith('crop_radish', 1);
      expect(inventoryManager.addItem).toHaveBeenCalledWith('seed_radish', expect.any(Number));

      // Plot should be fallow (needs re-tilling before planting again)
      const updatedPlot = farmManager.getPlot('test_map', position);
      expect(updatedPlot?.state).toBe(FarmPlotState.FALLOW);
      expect(updatedPlot?.cropType).toBeNull();
    });

    it('should not harvest unready crops', () => {
      const position = { x: 5, y: 10 };

      // Plant but don't make ready
      farmManager.tillSoil('test_map', position);
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

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
      farmManager.loadPlots([
        {
          ...plot,
          state: FarmPlotState.DEAD,
          cropType: 'radish',
        },
      ]);

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
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');

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
      farmManager.loadPlots([
        {
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
          quality: 'normal',
          fertiliserApplied: false,
        },
      ]);
      let plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(TileType.SOIL_FALLOW);

      // Tilled
      farmManager.tillSoil('test_map', position);
      plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(TileType.SOIL_TILLED);

      // Planted
      farmManager.plantSeed('test_map', position, 'radish', 'seed_radish');
      plot = farmManager.getPlot('test_map', position)!;
      expect(farmManager.getTileTypeForPlot(plot)).toBe(TileType.SOIL_PLANTED);
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
      const plots: FarmPlot[] = [
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
          quality: 'normal',
          fertiliserApplied: false,
        },
      ];

      farmManager.loadPlots(plots);

      const loadedPlot = farmManager.getPlot('test_map', { x: 1, y: 1 });
      expect(loadedPlot).toBeDefined();
      expect(loadedPlot?.state).toBe(FarmPlotState.TILLED);
    });
  });

  describe('Shared farming', () => {
    const makePlot = (
      mapId: string,
      x: number,
      y: number,
      state = FarmPlotState.TILLED
    ): FarmPlot => ({
      mapId,
      position: { x, y },
      state,
      cropType: state === FarmPlotState.TILLED ? null : 'radish',
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: 1,
      stateChangedAtHour: 12,
      plantedAtTimestamp: state === FarmPlotState.TILLED ? null : Date.now(),
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: Date.now(),
      quality: 'normal',
      fertiliserApplied: false,
    });

    describe('isSharedFarmMap', () => {
      it('should return true for village', () => {
        expect(farmManager.isSharedFarmMap('village')).toBe(true);
      });

      it('should return true for farm_area', () => {
        expect(farmManager.isSharedFarmMap('farm_area')).toBe(true);
      });

      it('should return false for personal_garden', () => {
        expect(farmManager.isSharedFarmMap('personal_garden')).toBe(false);
      });

      it('should return false for arbitrary maps', () => {
        expect(farmManager.isSharedFarmMap('test_map')).toBe(false);
        expect(farmManager.isSharedFarmMap('home_interior')).toBe(false);
      });
    });

    describe('getPersonalPlots', () => {
      it('should exclude plots on shared maps', () => {
        farmManager.loadPlots([
          makePlot('village', 5, 5),
          makePlot('farm_area', 3, 3),
          makePlot('personal_garden', 1, 1),
          makePlot('test_map', 2, 2),
        ]);

        const personal = farmManager.getPersonalPlots();
        expect(personal.length).toBe(2);
        expect(personal.every((p) => !['village', 'farm_area'].includes(p.mapId))).toBe(true);
      });

      it('should return empty when all plots are on shared maps', () => {
        farmManager.loadPlots([makePlot('village', 5, 5), makePlot('farm_area', 3, 3)]);

        expect(farmManager.getPersonalPlots().length).toBe(0);
      });

      it('should return all plots when none are on shared maps', () => {
        farmManager.loadPlots([makePlot('personal_garden', 1, 1), makePlot('test_map', 2, 2)]);

        expect(farmManager.getPersonalPlots().length).toBe(2);
      });
    });

    describe('applySharedUpdate', () => {
      it('should apply remote plot state to local plots', () => {
        const remotePlot = makePlot('village', 5, 5, FarmPlotState.PLANTED);
        farmManager.applySharedUpdate('village', remotePlot);

        const plot = farmManager.getPlot('village', { x: 5, y: 5 });
        expect(plot).toBeDefined();
        expect(plot?.state).toBe(FarmPlotState.PLANTED);
        expect(plot?.cropType).toBe('radish');
      });

      it('should overwrite existing plot with remote state', () => {
        // Start with a tilled plot
        farmManager.loadPlots([makePlot('village', 5, 5, FarmPlotState.TILLED)]);

        // Remote says it's now planted
        const remotePlot = makePlot('village', 5, 5, FarmPlotState.PLANTED);
        farmManager.applySharedUpdate('village', remotePlot);

        const plot = farmManager.getPlot('village', { x: 5, y: 5 });
        expect(plot?.state).toBe(FarmPlotState.PLANTED);
      });
    });

    describe('removeSharedPlot', () => {
      it('should reset existing plot to fallow', () => {
        farmManager.loadPlots([makePlot('village', 5, 5, FarmPlotState.PLANTED)]);

        farmManager.removeSharedPlot('village', 5, 5);

        const plot = farmManager.getPlot('village', { x: 5, y: 5 });
        expect(plot?.state).toBe(FarmPlotState.FALLOW);
        expect(plot?.cropType).toBeNull();
        expect(plot?.plantedAtTimestamp).toBeNull();
        expect(plot?.lastWateredTimestamp).toBeNull();
      });

      it('should do nothing for non-existent plots', () => {
        // Should not throw
        farmManager.removeSharedPlot('village', 99, 99);

        const plot = farmManager.getPlot('village', { x: 99, y: 99 });
        expect(plot).toBeUndefined();
      });
    });
  });
});
