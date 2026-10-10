-- Basket recovery email 3 (services/shop/basket-recovery.ts): when the third reminder went.
-- Additive and nullable. Must exist before the API that reads it is deployed. Applied to
-- shjpatdojoigcgmaewbg as migration shop_basket_recovery_email3.
alter table public.shop_baskets add column if not exists email3_at timestamptz;
