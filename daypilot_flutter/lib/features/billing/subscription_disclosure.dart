import 'package:flutter/services.dart';

import 'iap_products.dart';

/// Privacy policy already published for DayPilot.
const dayPilotPrivacyPolicyUrl = 'https://www.daypilot.co/privacy';

/// Apple's standard Licensed Application EULA. DayPilot has no separate
/// terms page. App Store Connect also uses this URL in the 1.0.1 description.
const dayPilotTermsOfUseUrl =
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/// One auto-renewable subscription the iOS binary sells.
class AutoRenewOffer {
  const AutoRenewOffer({
    required this.productId,
    required this.title,
    required this.period,
    required this.benefits,
  });

  final String productId;
  final String title;

  /// Subscription length shown next to the price.
  final String period;

  /// What the customer gets while the period is paid.
  final String benefits;
}

/// Founding 25 and Pro only. Personal, Business, and Enterprise are not sold.
const autoRenewOffers = <AutoRenewOffer>[
  AutoRenewOffer(
    productId: DayPilotIapProducts.foundingMonthly,
    title: 'Founding 25',
    period: '1 month',
    benefits:
        'During each 1-month period you get every Pro feature, the private Founder Hub, and early access to new features while this subscription stays active. Your founding rate stays while you stay subscribed.',
  ),
  AutoRenewOffer(
    productId: DayPilotIapProducts.proMonthly,
    title: 'Pro',
    period: '1 month',
    benefits:
        'During each 1-month period you get advanced scheduling, booking, and AI tools.',
  ),
];

AutoRenewOffer? autoRenewOfferFor(String productId) {
  for (final offer in autoRenewOffers) {
    if (offer.productId == productId) return offer;
  }
  return null;
}

/// StoreKit 2 `Product.purchase(options:)` must not include
/// `Product.PurchaseOption.quantity` for these auto-renewable subscriptions.
///
/// `in_app_purchase` 3.3 / storekit 0.4.11 `buyNonConsumable` always sends
/// quantity 1. Apple only allows that option on consumables and non-renewing
/// subscriptions. On an auto-renewable product StoreKit throws
/// `Product.PurchaseError.invalidQuantity` and never presents the payment sheet.
bool storeKit2PurchaseOmitsQuantity(String productId) =>
    autoRenewOfferFor(productId) != null;

/// True when StoreKit closed the sheet because the person cancelled.
bool storeKitErrorIsCancellation(Object error) {
  if (error is! PlatformException) return false;
  final code = error.code.toLowerCase();
  final message = (error.message ?? '').toLowerCase();
  if (code.contains('duplicate')) return false;
  return code == '2' ||
      code.contains('cancel') ||
      message.contains('cancel');
}

/// Text for the billing screen when StoreKit fails before or instead of the sheet.
String storeKitErrorText(Object error) {
  if (error is PlatformException) {
    final message = error.message?.trim();
    if (message != null && message.isNotEmpty) return message;
    return error.code;
  }
  final text = '$error'.replaceFirst('Exception: ', '').trim();
  return text.isEmpty ? 'The App Store could not start the purchase.' : text;
}
