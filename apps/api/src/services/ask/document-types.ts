// The kinds of document an agent can produce and save to the library. A second build adds the letter and newsletter templates by registering them here:
// nothing else needs to change. status: draft -> pending (waiting for approval) -> approved -> shared.
export interface DocumentType { id: string; label: string; agent: string | null; needsApproval: boolean; templates: Array<{ id: string; label: string }> }
export const DOCUMENT_TYPES: DocumentType[] = [
  { id: 'answer', label: 'Saved answer', agent: null, needsApproval: false, templates: [] },
  { id: 'letter', label: 'Letter', agent: 'letters', needsApproval: true, templates: [] },
  { id: 'newsletter', label: 'Staff newsletter', agent: 'newsletter', needsApproval: true, templates: [] },
  { id: 'report', label: 'Governance report', agent: 'governance', needsApproval: true, templates: [] },
  { id: 'notification', label: 'Notification draft', agent: 'notifications', needsApproval: false, templates: [] },
]
export const documentType = (id: string) => DOCUMENT_TYPES.find(t => t.id === id)
