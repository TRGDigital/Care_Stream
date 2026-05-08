export function Spinner() {
  return (
    <div className="flex items-center gap-1" role="status" aria-label="Loading">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-teal"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
