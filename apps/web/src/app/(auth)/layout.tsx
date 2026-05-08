export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-light px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-teal">CareStreamAI</span>
        </div>
        <div className="rounded-card bg-white p-8 shadow-card">
          {children}
        </div>
      </div>
    </div>
  )
}
