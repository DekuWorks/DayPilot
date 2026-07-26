import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../../core/config/nest_api_session.dart';
import 'iap_products.dart';

/// StoreKit / Play Billing wrapper + Nest entitlement sync.
class IapBillingService {
  IapBillingService(this._session);

  final NestApiSession _session;
  final InAppPurchase _iap = InAppPurchase.instance;

  StreamSubscription<List<PurchaseDetails>>? _sub;
  bool _available = false;
  List<ProductDetails> _products = const [];

  bool get isAvailable => _available;
  List<ProductDetails> get products => _products;

  Future<bool> init({
    required void Function(String message) onError,
    required Future<void> Function() onEntitlementSynced,
  }) async {
    _available = await _iap.isAvailable();
    if (!_available) return false;

    await _sub?.cancel();
    _sub = _iap.purchaseStream.listen(
      (purchases) => _onPurchases(
        purchases,
        onError: onError,
        onEntitlementSynced: onEntitlementSynced,
      ),
      onError: (Object e) => onError('$e'),
    );

    final response = await _iap.queryProductDetails(DayPilotIapProducts.all.toSet());
    if (response.error != null) {
      onError(response.error!.message);
    }
    _products = response.productDetails
      ..sort((a, b) => a.id.compareTo(b.id));
    return true;
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
  }

  Future<void> buy(ProductDetails product) async {
    final param = PurchaseParam(productDetails: product);
    // Auto-renewable subscriptions use buyNonConsumable on iOS StoreKit.
    await _iap.buyNonConsumable(purchaseParam: param);
  }

  Future<void> restore() => _iap.restorePurchases();

  Future<void> _onPurchases(
    List<PurchaseDetails> purchases, {
    required void Function(String message) onError,
    required Future<void> Function() onEntitlementSynced,
  }) async {
    for (final purchase in purchases) {
      if (purchase.status == PurchaseStatus.pending) continue;
      if (purchase.status == PurchaseStatus.error) {
        onError(purchase.error?.message ?? 'Purchase failed');
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
        continue;
      }
      if (purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.restored) {
        try {
          await _confirmWithApi(purchase);
          await onEntitlementSynced();
        } catch (e) {
          onError('$e');
        }
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
      }
      if (purchase.status == PurchaseStatus.canceled) {
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
      }
    }
  }

  Future<void> _confirmWithApi(PurchaseDetails purchase) async {
    if (!_session.hasSession) {
      await _session.exchangeFromSupabaseSession();
    }
    final transactionId =
        purchase.purchaseID ?? purchase.verificationData.serverVerificationData;
    if (transactionId.isEmpty) {
      throw Exception('Missing App Store transaction id');
    }
    final res = await _session.post(
      '/billing/apple/confirm',
      body: {
        'productId': purchase.productID,
        'transactionId': transactionId,
      },
    );
    if (res.statusCode >= 400) {
      throw Exception('Could not sync subscription (${res.statusCode})');
    }
  }
}
