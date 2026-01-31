/**
 * NPC Factory Functions - Re-exports
 *
 * This file re-exports all NPC factory functions for backward compatibility.
 * Individual NPC files are organized by location/type.
 */

// Village NPCs
export {
  createVillageElderNPC,
  createCatNPC,
  getCatDialogue,
  createOldWomanKnittingNPC,
  createDogNPC,
  createShopkeeperNPC,
  createVillageChildNPC,
  createDuckNPC,
} from './villageNPCs';

// Home/Family NPCs
export {
  createMumNPC,
} from './homeNPCs';

// Forest/Wildlife NPCs
export {
  createUmbraWolfNPC,
  createWitchWolfNPC,
  createChillBearNPC,
  createChillBearAtHomeNPC,
  createStellaNPC,
  createMorganNPC,
  createBunnyflyNPC,
  createMotherSeaNPC,
  createMushraNPC,
  createDeerNPC,
  createPuffleNPC,
  createSuffleNPC,
  createProfessorBirdimenNPC,
  createPossumNPC,
} from './forestNPCs';

// Farm NPCs
export {
  createCowNPC,
} from './farmNPCs';
