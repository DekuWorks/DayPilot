/// App Store / Play product IDs — keep in sync with API `APPLE_PRODUCT_*`
/// and `ios/Runner/DayPilot.storekit`.
abstract final class DayPilotIapProducts {
  static const personalMonthly = 'co.daypilot.personal.monthly';
  static const businessMonthly = 'co.daypilot.business.monthly';
  static const enterpriseMonthly = 'co.daypilot.enterprise.monthly';

  static const all = <String>[
    personalMonthly,
    businessMonthly,
    enterpriseMonthly,
  ];

  static String labelFor(String productId) {
    switch (productId) {
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

  /// Maps StoreKit product → DayPilot tier name (matches Nest / Stripe).
  static String? tierFor(String productId) {
    switch (productId) {
      case personalMonthly:
        return 'Personal';
      case businessMonthly:
        return 'Business';
      case enterpriseMonthly:
        return 'Enterprise';
      default:
        return null;
    }
  }
}
