import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/daypilot_env.dart';
import '../../core/providers/bootstrap_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/feature_scaffold.dart';
import 'iap_billing_service.dart';
import 'iap_products.dart';

/// Billing — App Store subscriptions on iOS. The website does not sell plans.
class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  bool _loading = true;
  String? _error;
  String? _notice;
  Map<String, dynamic>? _subscription;
  Map<String, dynamic>? _founding;
  bool _actionBusy = false;
  IapBillingService? _iap;
  List<ProductDetails> _storeProducts = const [];
  bool _iapReady = false;

  bool get _isIos => !kIsWeb && Platform.isIOS;

  bool get _foundingOpen {
    final available = _founding?['offerAvailable'];
    if (available is bool) return available;
    return true;
  }

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _iap?.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await _load();
    if (_isIos && DayPilotEnv.hasDaypilotApi) {
      await _initIap();
    }
  }

  Future<void> _initIap() async {
    final service = IapBillingService(ref.read(nestApiSessionProvider));
    _iap = service;
    final ok = await service.init(
      onError: (message) {
        if (!mounted) return;
        setState(() => _error = message);
      },
      onEntitlementSynced: () async {
        await _load();
      },
    );
    if (!mounted) return;
    setState(() {
      _iapReady = ok;
      _storeProducts = service.products;
      if (!ok) {
        _notice = 'App Store purchases are unavailable on this device.';
      } else if (_storeProducts.isEmpty) {
        _notice =
            'App Store prices are still loading. Comparison prices below are the intended USD prices.';
      }
    });
  }

  Future<void> _load() async {
    if (!DayPilotEnv.hasDaypilotApi) {
      setState(() {
        _loading = false;
        _subscription = {
          'tier': 'Free',
          'displayName': 'Free',
          'status': 'active',
          'currentPeriodEnd': null,
        };
        _notice =
            'Showing Free plan. Subscription status will sync when the API is available.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final session = ref.read(nestApiSessionProvider);
      if (!session.hasSession) {
        await session.exchangeFromSupabaseSession();
      }
      final subRes = await session.get('/billing/subscription');
      final foundingRes = await session.get('/billing/founding');
      if (subRes.statusCode >= 400) {
        throw Exception('unavailable');
      }
      Map<String, dynamic>? founding;
      if (foundingRes.statusCode < 400) {
        final decoded = jsonDecode(foundingRes.body);
        if (decoded is Map) founding = Map<String, dynamic>.from(decoded);
      }
      setState(() {
        _subscription = Map<String, dynamic>.from(jsonDecode(subRes.body) as Map);
        _founding = founding;
        _notice = null;
      });
    } catch (_) {
      setState(() {
        _subscription = {
          'tier': 'Free',
          'displayName': 'Free',
          'status': 'active',
          'currentPeriodEnd': null,
        };
        _notice =
            'Billing service is unavailable right now. Showing the Free plan until it reconnects.';
        _error = null;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openLink(String url) async {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Future<void> _buy(ProductDetails product) async {
    setState(() {
      _actionBusy = true;
      _error = null;
    });
    try {
      await _iap?.buy(product);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _restore() async {
    setState(() {
      _actionBusy = true;
      _error = null;
      _notice = null;
    });
    try {
      await _iap?.restore();
      if (mounted) {
        setState(() {
          _notice =
              'Restore requested. Your plan updates when the App Store finishes.';
        });
      }
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  ProductDetails? _product(String id) {
    for (final product in _storeProducts) {
      if (product.id == id) return product;
    }
    return null;
  }

  String _spotsLine() {
    final remaining = _founding?['remainingCount'];
    final limit = _founding?['limit'];
    if (remaining is num && limit is num) {
      return '${remaining.toInt()} of ${limit.toInt()} spots remaining';
    }
    return 'Checking how many founding spots are left.';
  }

  @override
  Widget build(BuildContext context) {
    final display =
        '${_subscription?['displayName'] ?? _subscription?['tier'] ?? 'Free'}';
    final status = '${_subscription?['status'] ?? '—'}';
    final founder = _subscription?['founderNumber'];
    return FeatureScaffold(
      title: 'Billing',
      fallbackRoute: '/dashboard',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Manage your plan. Paid plans are bought with Apple.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: DayPilotScheme.of(context).textSecondary,
                      ),
                ),
                const SizedBox(height: 16),
                if (_notice != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _notice!,
                      style: TextStyle(
                        color: DayPilotScheme.of(context).textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _error!,
                      style: TextStyle(color: DayPilotColors.error),
                    ),
                  ),
                _PlanSummary(
                  display: display,
                  status: status,
                  founderNumber: founder is num ? founder.toInt() : null,
                ),
                const SizedBox(height: 20),
                if (_foundingOpen) ...[
                  _OfferCard(
                    kicker: 'FOUNDING 25',
                    title: 'Help shape the future of DayPilot.',
                    body:
                        r'Join the first 25 paid members and unlock every Pro feature for only $5/month. Your founding rate remains active while you stay subscribed.',
                    detail: _spotsLine(),
                    featured: true,
                    trailing: _isIos
                        ? _PurchaseButton(
                            label: 'Become a Founding Member',
                            product: _product(DayPilotIapProducts.foundingMonthly),
                            busy: _actionBusy || !_iapReady,
                            onBuy: _buy,
                          )
                        : null,
                  ),
                  if (_isIos &&
                      _product(DayPilotIapProducts.foundingMonthly) == null)
                    _IntendedPriceNote(r'$5/month until the App Store price loads.'),
                  const SizedBox(height: 12),
                ],
                _OfferCard(
                  kicker: 'PRO',
                  title: 'Pro',
                  body:
                      'Manage and optimize your time with advanced scheduling, booking and AI tools.',
                  detail: _product(DayPilotIapProducts.proMonthly) == null
                      ? r'Intended price $10/month.'
                      : null,
                  trailing: _isIos
                      ? _PurchaseButton(
                          label: 'Upgrade to Pro',
                          product: _product(DayPilotIapProducts.proMonthly),
                          busy: _actionBusy || !_iapReady,
                          onBuy: _buy,
                        )
                      : null,
                ),
                const SizedBox(height: 12),
                const _OfferCard(
                  kicker: 'FREE',
                  title: 'Free',
                  body:
                      r'$0 forever. Day, week, and month views, 1 external calendar connection, and 1 booking link.',
                ),
                const SizedBox(height: 12),
                _OfferCard(
                  kicker: 'TEAM — COMING SOON',
                  title: 'Team',
                  body:
                      r'Coordinate schedules, availability and bookings across your entire team. $20/month planned.',
                  trailing: TextButton(
                    onPressed: () => _openLink(
                      'https://www.daypilot.co/pricing#team-waitlist',
                    ),
                    child: const Text('Join the Team Waitlist'),
                  ),
                ),
                const SizedBox(height: 12),
                _OfferCard(
                  kicker: 'ENTERPRISE — COMING SOON',
                  title: 'Enterprise',
                  body:
                      'Advanced scheduling, administration and security for large organizations. Custom pricing.',
                  trailing: TextButton(
                    onPressed: () => _openLink(
                      'https://www.daypilot.co/pricing#enterprise-waitlist',
                    ),
                    child: const Text('Join the Enterprise Waitlist'),
                  ),
                ),
                if (_isIos) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Founding 25 and Pro are 1-month auto-renewable subscriptions. '
                    'Team and Enterprise are not for sale. '
                    'The button price is the App Store price for your country. '
                    'Payment is charged to your Apple ID when you confirm. '
                    'The plan renews unless you cancel at least 24 hours before the period ends. '
                    'Canceling keeps access until the paid period ends. '
                    'You can manage or cancel it in your App Store account settings.',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).textSecondary,
                      fontSize: 13,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    children: [
                      TextButton(
                        onPressed: () =>
                            _openLink('https://www.daypilot.co/privacy'),
                        child: const Text('Privacy Policy'),
                      ),
                      TextButton(
                        onPressed: () => _openLink(
                          'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
                        ),
                        child: const Text('Terms of Use'),
                      ),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: _actionBusy ? null : _restore,
                    child: const Text('Restore purchases'),
                  ),
                ],
                if (!_isIos) ...[
                  const SizedBox(height: 20),
                  Text(
                    'Subscriptions are bought in the DayPilot iOS app.',
                    style: TextStyle(
                      color: DayPilotScheme.of(context).textSecondary,
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}

class _PlanSummary extends StatelessWidget {
  const _PlanSummary({
    required this.display,
    required this.status,
    required this.founderNumber,
  });

  final String display;
  final String status;
  final int? founderNumber;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DayPilotScheme.of(context).borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Current plan',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            display,
            style: const TextStyle(
              color: DayPilotColors.brand500,
              fontSize: 28,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (founderNumber != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                'Founding Member #${founderNumber!.toString().padLeft(2, '0')}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          Text(
            'Status: $status',
            style: TextStyle(color: DayPilotScheme.of(context).textSecondary),
          ),
        ],
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.kicker,
    required this.title,
    required this.body,
    this.detail,
    this.featured = false,
    this.trailing,
  });

  final String kicker;
  final String title;
  final String body;
  final String? detail;
  final bool featured;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DayPilotScheme.of(context).surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: featured
              ? DayPilotColors.brand500
              : DayPilotScheme.of(context).borderSubtle,
          width: featured ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            kicker,
            style: const TextStyle(
              color: DayPilotColors.brand500,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            body,
            style: TextStyle(
              color: DayPilotScheme.of(context).textSecondary,
              height: 1.35,
            ),
          ),
          if (detail != null) ...[
            const SizedBox(height: 8),
            Text(detail!, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
          if (trailing != null) ...[
            const SizedBox(height: 12),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class _PurchaseButton extends StatelessWidget {
  const _PurchaseButton({
    required this.label,
    required this.product,
    required this.busy,
    required this.onBuy,
  });

  final String label;
  final ProductDetails? product;
  final bool busy;
  final Future<void> Function(ProductDetails product) onBuy;

  @override
  Widget build(BuildContext context) {
    final price = product?.price;
    return FilledButton(
      onPressed: product == null || busy ? null : () => onBuy(product!),
      child: Text(price == null ? label : '$label — $price'),
    );
  }
}

class _IntendedPriceNote extends StatelessWidget {
  const _IntendedPriceNote(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(
        text,
        style: TextStyle(
          color: DayPilotScheme.of(context).textSecondary,
          fontSize: 12,
        ),
      ),
    );
  }
}
