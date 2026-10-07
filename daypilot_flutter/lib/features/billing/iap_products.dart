/// StoreKit product IDs. Keep in sync with the Nest catalog
/// (`packages/lib/src/pricing/catalog.ts`) and App Store Connect.
///
/// Purchase buttons must use [ProductDetails.price] from StoreKit.
/// [intendedMarketingPrice] is only for comparison copy before products load.
abstract final class DayPilotIapProducts {
  static const foundingMonthly = 'daypilot.pro.founding.monthly';
  static const proMonthly = 'daypilot.pro.monthly';

  /// Legacy 1.0 / 1.0.1 products. Recognized on restore. Not queried for sale.
  static const personalMonthly = 'co.daypilot.personal.monthly';
  static const businessMonthly = 'co.daypilot.business.monthly';
  static const enterpriseMonthly = 'co.daypilot.enterprise.monthly';

  static const forSale = <String>[
    foundingMonthly,
    proMonthly,
  ];

  static String? intendedMarketingPrice(String productId) {
    switch (productId) {
      case foundingMonthly:
        return r'$5';
      case proMonthly:
        return r'$10';
      default:
        return null;
    }
  }

  static String labelFor(String productId) {
    switch (productId) {
      case foundingMonthly:
        return 'Founding 25';
      case proMonthly:
        return 'Pro';
      case personalMonthly:
        return 'Personal';
      case businessMonthly:
        return 'Business';
      case enterpriseMonthly:
        return 'Enterprise';
      default:
        return productId;
    }
  }

  static String? planIdFor(String productId) {
    switch (productId) {
      case foundingMonthly:
        return 'founding_pro';
      case proMonthly:
      case personalMonthly:
        return 'pro';
      case businessMonthly:
        return 'team';
      case enterpriseMonthly:
        return 'enterprise';
      default:
        return null;
    }
  }
}
