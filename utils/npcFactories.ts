/**
 * NPC Factory Functions
 *
 * Re-exports all NPC factory functions for backward compatibility.
 * Individual NPC definitions are now organized in the npcs/ directory:
 * - npcs/villageNPCs.ts - Village Elder, Cat, Old Woman, Dog, Village Child, Shopkeeper, Duck
 * - npcs/homeNPCs.ts - Mum
 * - npcs/forestNPCs.ts - Umbra Wolf, Witch Wolf, Chill Bear, Stella, Morgan, Bunnyfly
 */

export {
  // Village NPCs
  createVillageElderNPC,
  createCatNPC,
  getCatDialogue,
  createOldWomanKnittingNPC,
  createDogNPC,
  createShopkeeperNPC,
  createVillageChildNPC,
  createDuckNPC,
  // Home/Family NPCs
  createMumNPC,
  // Forest/Wildlife NPCs
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
  createSparrowNPC,
  // Farm NPCs
  createCowNPC,
} from './npcs';
