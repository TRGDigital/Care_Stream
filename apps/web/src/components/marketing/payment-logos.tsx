import './payment-logos.css'

// The ways to pay, shown beside the buy buttons: the cards and wallets the Stripe checkout takes.
// Drawn inline (no image requests), each in its usual colours so it is recognised at a glance.
export function PaymentLogos({ className = '' }: { className?: string }) {
  return (
    <div className={`paylogos ${className}`.trim()} aria-label="We accept Visa, Mastercard, American Express, Apple Pay and Google Pay">
      <span className="paylogo visa" aria-hidden="true">
        <svg viewBox="0 0 48 16"><text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="15" fill="#1A1F71" letterSpacing="-.5">VISA</text></svg>
      </span>
      <span className="paylogo mc" aria-hidden="true">
        <svg viewBox="0 0 40 24"><circle cx="15" cy="12" r="9" fill="#EB001B" /><circle cx="25" cy="12" r="9" fill="#F79E1B" /><path d="M20 4.5a9 9 0 0 1 0 15 9 9 0 0 1 0-15z" fill="#FF5F00" /></svg>
      </span>
      <span className="paylogo amex" aria-hidden="true">
        <svg viewBox="0 0 48 16"><rect width="48" height="16" rx="2" fill="#2E77BC" /><text x="24" y="12" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="10" fill="#fff" letterSpacing=".5">AMEX</text></svg>
      </span>
      <span className="paylogo apple" aria-hidden="true">
        <svg viewBox="0 0 52 20"><path d="M10.6 10.6c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.9 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.8 2-1.7.6-.9.9-1.8.9-1.9 0 0-1.8-.7-1.8-3zM9 5.8c.5-.6.8-1.3.7-2.1-.7 0-1.5.5-2 1.1-.4.5-.8 1.3-.7 2.1.8 0 1.5-.4 2-1.1z" fill="#000" /><text x="33" y="15" textAnchor="middle" fontFamily="-apple-system, Helvetica, Arial, sans-serif" fontWeight="600" fontSize="13" fill="#000">Pay</text></svg>
      </span>
      <span className="paylogo gpay" aria-hidden="true">
        <svg viewBox="0 0 52 20"><text x="4" y="15" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="14"><tspan fill="#4285F4">G</tspan></text><text x="31" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" fontSize="13" fill="#5F6368">Pay</text></svg>
      </span>
      <span className="paysecure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Secure payment by Stripe
      </span>
    </div>
  )
}
