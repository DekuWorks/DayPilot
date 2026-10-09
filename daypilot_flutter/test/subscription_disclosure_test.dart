import 'package:daypilot_flutter/features/billing/iap_products.dart';
import 'package:daypilot_flutter/features/billing/subscription_disclosure.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('only Founding 25 and Pro are sold as auto-renewable subscriptions', () {
    expect(
      autoRenewOffers.map((offer) => offer.productId).toList(),
      DayPilotIapProducts.forSale,
    );
    expect(
      autoRenewOffers.map((offer) => offer.productId),
      isNot(contains(DayPilotIapProducts.personalMonthly)),
    );
    expect(
      autoRenewOffers.map((offer) => offer.productId),
      isNot(contains(DayPilotIapProducts.businessMonthly)),
    );
    expect(
      autoRenewOffers.map((offer) => offer.productId),
      isNot(contains(DayPilotIapProducts.enterpriseMonthly)),
    );
  });

  test('each sold subscription shows title, 1 month, benefits, and legal links', () {
    expect(dayPilotPrivacyPolicyUrl, 'https://www.daypilot.co/privacy');
    expect(
      dayPilotTermsOfUseUrl,
      'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
    );
    expect(autoRenewOffers, hasLength(2));
    for (final offer in autoRenewOffers) {
      expect(offer.title, isNotEmpty);
      expect(offer.period, '1 month');
      expect(offer.benefits, contains('1-month'));
      expect(storeKit2PurchaseOmitsQuantity(offer.productId), isTrue);
    }
    expect(autoRenewOffers.first.title, 'Founding 25');
    expect(autoRenewOffers.last.title, 'Pro');
    expect(
      storeKit2PurchaseOmitsQuantity(DayPilotIapProducts.personalMonthly),
      isFalse,
    );
  });

  test('a cancelled StoreKit sheet is not shown as a purchase error', () {
    expect(
      storeKitErrorIsCancellation(
        PlatformException(code: '2', message: 'Payment cancelled'),
      ),
      isTrue,
    );
    expect(
      storeKitErrorIsCancellation(
        PlatformException(
          code: 'storekit_duplicate_product_object',
          message: 'There is a pending transaction',
        ),
      ),
      isFalse,
    );
    expect(
      storeKitErrorText(
        PlatformException(
          code: 'storekit2_failed_to_fetch_product',
          message: 'Storekit has failed to fetch this product.',
        ),
      ),
      'Storekit has failed to fetch this product.',
    );
  });
}
