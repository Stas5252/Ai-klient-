import type {Lead,Permission} from './types';
// No third-party sending adapter is enabled. Consent gates stay useful for future adapters.
export function canSend(l:Lead,p:Permission):boolean {return !l.doNotContact&&p.approved&&p.consent&&p.platformAllows&&p.recipientVerified&&p.adapter==='telegram'&&l.category==='inbound';}
