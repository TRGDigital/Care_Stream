import { redirect } from 'next/navigation'

// CQC Prep now lives inside the hub (chat) layout so the sidebar persists.
// Keep this route for existing links/bookmarks — send them to the hub view.
export default function CqcRedirect() {
  redirect('/chat?view=cqc')
}
