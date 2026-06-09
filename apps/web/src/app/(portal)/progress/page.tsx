import { redirect } from 'next/navigation'

// My Progress now lives inside the hub (chat) layout so the sidebar persists.
// Keep this route for existing links/bookmarks — send them to the hub view.
export default function ProgressRedirect() {
  redirect('/chat?view=progress')
}
