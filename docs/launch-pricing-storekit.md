# Launch pricing — App Store Connect (manual)

The website does not sell plans. Purchases are StoreKit in the DayPilot iOS app (DayPilot Daily).

These two products are not confirmed live. Create them by hand. Do not submit a binary. Do not resubmit the rejected 1.0.1 build 16. Do not delete the existing products. Do not add territories beyond the United States and the United Kingdom.

## Products to create

In App Store Connect → DayPilot Daily (Apple ID 6798407960) → Subscriptions:

| Product ID                      | Plan        | Price     | Period  | Territories   |
| ------------------------------- | ----------- | --------- | ------- | ------------- |
| `daypilot.pro.founding.monthly` | Founding 25 | USD 5.00  | 1 month | USA, GBR only |
| `daypilot.pro.monthly`          | Pro         | USD 10.00 | 1 month | USA, GBR only |

Use a subscription group that is not part of the rejected 1.0.1 submission, or add the products without attaching them to that build. Do not select them on the rejected version.

Leave these products in place:

- `co.daypilot.personal.monthly`
- `co.daypilot.business.monthly`
- `co.daypilot.enterprise.monthly`

Do not create a Team or Enterprise subscription.

## After the products exist

A customer still cannot buy Founding 25 or Pro in the App Store build that is live today. Version 1.0 does not query `daypilot.pro.founding.monthly` or `daypilot.pro.monthly`. A new build has to be approved before those IDs can be purchased. Do not submit that build from this change.

`POST /billing/apple/confirm` checks the StoreKit 2 signed transaction against Apple's certificate. `APPLE_IAP_SKIP_VERIFY=1` is ignored in production. Do not set it there.

Founding stays open unless `FOUNDING_OFFER_ENABLED` is set to `false` on the API.

Apply `prisma/migrations/20261007170000_launch_pricing` to the API database before founding confirms. That migration is additive. Do not run it from an agent against production if the database host is unclear.
