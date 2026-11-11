# Test script: New policies tab (free test tenant CS-1021, len+free1@)

1. Sign in as len+free1@orreryintelligence.com, open /policies. A third tab, **New policies**, sits next to History.
2. Open it. Expect a short loading line, then cards for every policy in the shop with title, description, price and a Buy button, plus Packs at the top. If it cannot load you see a red message and Try again (never an endless spinner; each request gives up after 15 seconds).
3. Search "safeguarding": the list narrows. Change the sort (price low to high, high to low, A to Z). Tick "Not yet owned".
4. Click **Buy** on one inexpensive policy. Expect "Opening checkout…" and the existing Stripe Checkout, with your email filled in. Pay with a Stripe test card only if the API is on test keys; otherwise stop at the Stripe page and go back.
5. After paying: you return to the shop thank-you page, the order appears under "Your policy orders" on /policies (needs your details, then written and checked by a person), and the card on the New policies tab now says **Owned**. A refunded order does not count as owned.
6. Check the free allowance: the strip at the top still says X of 5, unchanged by the purchase. (A bought policy never uses one of the 5 places.)
7. Upload a policy with the same name as a shop policy: its card shows **In your library** with "Buy a written version".
8. Sign in as a paid tenant: the same tab shows, without the "free places" sentence.
