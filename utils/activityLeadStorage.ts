import { gameState } from '../GameState';
import { ACTIVITY_LEADS, type ActivityLeadId } from './activityDiscovery';

// Stored with the character's existing quest data, including cloud saves. Never completed.
const KNOWLEDGE_ID = 'activity_discovery_knowledge';
export function hasActivityLead(id: ActivityLeadId): boolean {
  return gameState.getQuestData(KNOWLEDGE_ID, id) === true;
}
export function rememberActivityLead(id: ActivityLeadId): void {
  gameState.startQuest(KNOWLEDGE_ID);
  gameState.setQuestData(KNOWLEDGE_ID, id, true);
}
export function getRememberedActivityLeads() {
  return ACTIVITY_LEADS.filter((lead) => hasActivityLead(lead.id));
}
