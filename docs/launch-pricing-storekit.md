# Launch pricing — App Store Connect (manual)

The website does not sell plans. Purchases are StoreKit in the DayPilot iOS app (DayPilot Daily).

These two products were not created from this machine because App Store Connect login failed. Create them by hand. Do not resubmit the rejected 1.0.1 build 16. Do not delete the existing products. Sell the new products in every storefront Apple can review from, not only the United States and the United Kingdom. The 2.1(b) rejection happened when a reviewer storefront had no products.

## Products to create

In App Store Connect → DayPilot Daily (Apple ID 6798407960) → Subscriptions:

| Product ID                      | Plan        | Price     | Period  | Territories     |
| ------------------------------- | ----------- | --------- | ------- | --------------- |
| `daypilot.pro.founding.monthly` | Founding 25 | USD 5.00  | 1 month | All storefronts |
| `daypilot.pro.monthly`          | Pro         | USD 10.00 | 1 month | All storefronts |

Use a subscription group that is not part of the rejected 1.0.1 submission, or add the products without attaching them to that build. Do not select them on the rejected version.

Leave these products in place:

- `co.daypilot.personal.monthly`
- `co.daypilot.business.monthly`
- `co.daypilot.enterprise.monthly`

Do not create a Team or Enterprise subscription.

## After the products exist

Version 1.0, which is on sale, does not query `daypilot.pro.founding.monthly` or `daypilot.pro.monthly`. Those products cannot be bought until a later build is approved. The next build number in the repo is 17. Do not resubmit build 16.

`POST /billing/apple/confirm` checks the StoreKit 2 signed transaction against Apple's certificate. `APPLE_IAP_SKIP_VERIFY=1` is ignored in production. Do not set it there.

Founding stays open unless `FOUNDING_OFFER_ENABLED` is set to `false` on the API.

The API image runs `prisma migrate deploy` on startup. `prisma/migrations/20261007170000_launch_pricing` adds founding claims and the waitlist. It does not drop tables.
