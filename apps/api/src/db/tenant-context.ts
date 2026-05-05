import { AsyncLocalStorage } from 'async_hooks'

// Per-request tenant context using AsyncLocalStorage.
// Allows any service function to call getTenantId() without needing
// tenant_id threaded through every function signature.
//
// Usage:
//   tenantContext.run({ tenantId }, async () => {
//     // all code here can call getTenantId()
//   })

interface TenantStore {
  tenantId: string
}

export const tenantContext = new AsyncLocalStorage<TenantStore>()

export function getTenantId(): string {
  const store = tenantContext.getStore()
  if (!store) {
    throw new Error('getTenantId() called outside of a tenant context. Ensure requireAuth middleware is applied.')
  }
  return store.tenantId
}

export function getTenantIdOrNull(): string | null {
  return tenantContext.getStore()?.tenantId ?? null
}
