import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_2_wrappers.dart';

import '../../core/config/nest_api_session.dart';
import 'iap_products.dart';
import 'subscription_disclosure.dart';

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
      onError: (Object e) => onError(storeKitErrorText(e)),
    );

    final response =
        await _iap.queryProductDetails(DayPilotIapProducts.forSale.toSet());
    // A query error must not block the buy button. Purchase by product id
    // asks StoreKit for the product again and presents the sheet.
    _products = response.productDetails
      ..sort((a, b) => a.id.compareTo(b.id));
    return true;
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
  }

  /// Starts the App Store payment sheet for a product the binary sells.
  ///
  /// On iOS this does not call [InAppPurchase.buyNonConsumable]. That API
  /// sends StoreKit 2 `quantity: 1`, which throws
  /// `Product.PurchaseError.invalidQuantity` for these auto-renewable
  /// subscriptions and never presents the sheet. The same call is used on
  /// iPhone and iPad (`Platform.isIOS` is true for both).
  Future<void> buyProduct(String productId) async {
    if (!storeKit2PurchaseOmitsQuantity(productId)) {
      throw StateError('That plan is not for sale in the app.');
    }
    if (!kIsWeb && Platform.isIOS && _storeKit2Enabled) {
      await _buyStoreKit2Subscription(productId);
      return;
    }
    final product = _detailsFor(productId);
    if (product == null) {
      throw StateError(
        'The App Store has not loaded this subscription yet. Try again in a moment.',
      );
    }
    final started = await _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: product),
    );
    if (!started) {
      throw StateError('The App Store did not start the purchase.');
    }
  }

  Future<void> buy(ProductDetails product) => buyProduct(product.id);

  Future<void> restore() => _iap.restorePurchases();

  bool get _storeKit2Enabled => InAppPurchaseStoreKitPlatform.isStoreKit2Enabled;

  ProductDetails? _detailsFor(String productId) {
    for (final product in _products) {
      if (product.id == productId) return product;
    }
    return null;
  }

  Future<void> _buyStoreKit2Subscription(String productId) async {
    try {
      await _finishUnfinished(productId);
    } catch (_) {
      // Clearing a stuck transaction must not replace the payment sheet.
    }
    try {
      // No purchase options. Quantity is omitted on purpose.
      await SK2Product.purchase(productId);
    } on PlatformException catch (e) {
      if (storeKitErrorIsCancellation(e)) return;
      if (e.code != 'storekit_duplicate_product_object') rethrow;
      try {
        await _finishUnfinished(productId);
      } catch (_) {}
      await SK2Product.purchase(productId);
    }
  }

  /// The StoreKit 2 plugin refuses to call `product.purchase()` when an
  /// unfinished transaction exists for the same product, and returns that
  /// refusal as an error. Sync a signed transaction, then finish it, so the
  /// next purchase call can present the sheet.
  Future<void> _finishUnfinished(String productId) async {
    final unfinished = await SK2Transaction.unfinishedTransactions();
    for (final tx in unfinished) {
      if (tx.productId != productId) continue;
      final id = int.tryParse(tx.id);
      if (id == null || id <= 0) continue;
      final signed = tx.receiptData?.trim() ?? '';
      if (signed.isNotEmpty) {
        try {
          await _confirmTransaction(
            productId: tx.productId,
            transactionId: tx.id,
            originalTransactionId:
                tx.originalId.isNotEmpty ? tx.originalId : tx.id,
            signedTransaction: signed,
          );
        } catch (_) {
          // A failed sync must not keep the sheet from opening.
        }
      }
      await SK2Transaction.finish(id);
    }
  }

  Future<void> _onPurchases(
    List<PurchaseDetails> purchases, {
    required void Function(String message) onError,
    required Future<void> Function() onEntitlementSynced,
  }) async {
    for (final purchase in purchases) {
      try {
        if (purchase.status == PurchaseStatus.pending) continue;
        if (purchase.status == PurchaseStatus.error) {
          final failure = purchase.error;
          if (failure == null ||
              !storeKitErrorIsCancellation(
                PlatformException(code: failure.code, message: failure.message),
              )) {
            onError(failure?.message ?? 'Purchase failed');
          }
          await _completeIfNeeded(purchase);
          continue;
        }
        if (purchase.status == PurchaseStatus.purchased ||
            purchase.status == PurchaseStatus.restored) {
          try {
            await _confirmWithApi(purchase);
            await onEntitlementSynced();
          } catch (e) {
            onError(storeKitErrorText(e));
          }
          await _completeIfNeeded(purchase);
        }
        if (purchase.status == PurchaseStatus.canceled) {
          await _completeIfNeeded(purchase);
        }
      } catch (e) {
        onError(storeKitErrorText(e));
      }
    }
  }

  Future<void> _completeIfNeeded(PurchaseDetails purchase) async {
    if (!purchase.pendingCompletePurchase) return;
    final id = purchase.purchaseID;
    if (id == null || id.isEmpty || id == '0') return;
    await _iap.completePurchase(purchase);
  }

  Future<void> _confirmWithApi(PurchaseDetails purchase) async {
    final transactionId = purchase.purchaseID ?? '';
    final signedTransaction =
        purchase.verificationData.serverVerificationData.trim();
    if (transactionId.isEmpty) {
      throw Exception('Missing App Store transaction id');
    }
    final originalTransactionId =
        _originalTransactionId(purchase) ?? transactionId;
    await _confirmTransaction(
      productId: purchase.productID,
      transactionId: transactionId,
      originalTransactionId: originalTransactionId,
      signedTransaction: signedTransaction,
    );
  }

  Future<void> _confirmTransaction({
    required String productId,
    required String transactionId,
    required String originalTransactionId,
    required String signedTransaction,
  }) async {
    if (!_session.hasSession) {
      await _session.exchangeFromSupabaseSession();
    }
    final res = await _session.post(
      '/billing/apple/confirm',
      body: {
        'productId': productId,
        'transactionId': transactionId,
        'originalTransactionId': originalTransactionId,
        if (signedTransaction.isNotEmpty)
          'signedTransaction': signedTransaction,
      },
    );
    if (res.statusCode >= 400) {
      throw Exception('Could not sync subscription (${res.statusCode})');
    }
  }
}

/// Reads originalTransactionId from the StoreKit JWS payload when present.
/// The server assigns founder numbers. This value is not a founder number.
String? _originalTransactionId(PurchaseDetails purchase) {
  final jws = purchase.verificationData.serverVerificationData;
  final parts = jws.split('.');
  if (parts.length < 2) return purchase.purchaseID;
  try {
    final normalized = base64Url.normalize(parts[1]);
    final decoded = utf8.decode(base64Url.decode(normalized));
    final json = jsonDecode(decoded);
    if (json is Map && json['originalTransactionId'] != null) {
      return '${json['originalTransactionId']}';
    }
  } catch (_) {}
  return purchase.purchaseID;
}
