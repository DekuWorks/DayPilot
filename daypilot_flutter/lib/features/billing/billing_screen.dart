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

/// Billing — Stripe (web portal) + App Store subscriptions on iOS.
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
  bool _actionBusy = false;
  IapBillingService? _iap;
  List<ProductDetails> _storeProducts = const [];
  bool _iapReady = false;

  bool get _isIos => !kIsWeb && Platform.isIOS;

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
        _notice =
            'App Store purchases are unavailable on this device. You can still manage billing on the web.';
      } else if (_storeProducts.isEmpty) {
        _notice =
            'No App Store products loaded. Use DayPilot.storekit in Xcode or create products in App Store Connect.';
      }
    });
  }

  Future<void> _load() async {
    if (!DayPilotEnv.hasDaypilotApi) {
      setState(() {
        _loading = false;
        _subscription = {
          'tier': 'Free',
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
      final res = await session.get('/billing/subscription');
      if (res.statusCode >= 400) {
        throw Exception('unavailable');
      }
      setState(() {
        _subscription =
            Map<String, dynamic>.from(jsonDecode(res.body) as Map);
        _notice = null;
      });
    } catch (_) {
      setState(() {
        _subscription = {
          'tier': 'Free',
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

  Future<void> _openPortal() async {
    if (!DayPilotEnv.hasDaypilotApi) {
      setState(
        () => _error = 'Billing portal is temporarily unavailable. Try again later.',
      );
      return;
    }
    setState(() {
      _actionBusy = true;
      _error = null;
    });
    try {
      final session = ref.read(nestApiSessionProvider);
      final res = await session.post('/billing/portal-session', body: {});
      if (res.statusCode >= 400) {
        throw Exception(res.body);
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final url = data['url'] as String?;
      if (url != null) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _upgradeOnWeb() async {
    final uri = Uri.parse('https://www.daypilot.co/billing');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
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
    });
    try {
      await _iap?.restore();
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tier = '${_subscription?['tier'] ?? 'Free'}';
    final status = '${_subscription?['status'] ?? '—'}';
    final isFree = tier == 'Free';
    return FeatureScaffold(
      title: 'Billing',
      fallbackRoute: '/dashboard',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Manage your plan and payment method.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: DayPilotColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 16),
                if (_notice != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _notice!,
                      style: const TextStyle(
                        color: DayPilotColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: DayPilotColors.error),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: DayPilotColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: DayPilotColors.borderSubtle),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Current plan',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        tier,
                        style: const TextStyle(
                          color: DayPilotColors.brand500,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'Status: $status',
                        style: const TextStyle(
                          color: DayPilotColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_isIos && isFree && _iapReady && _storeProducts.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'Subscribe with Apple',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  ..._storeProducts.map((p) {
                    final label = DayPilotIapProducts.labelFor(p.id);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FilledButton(
                        onPressed: _actionBusy ? null : () => _buy(p),
                        child: Text('Upgrade to $label — ${p.price}'),
                      ),
                    );
                  }),
                  OutlinedButton(
                    onPressed: _actionBusy ? null : _restore,
                    child: const Text('Restore purchases'),
                  ),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _actionBusy ? null : _upgradeOnWeb,
                  child: Text(
                    _isIos
                        ? 'Manage on web (Stripe)'
                        : 'Upgrade / manage on web',
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: _actionBusy ? null : _openPortal,
                  child: const Text('Open Stripe portal'),
                ),
              ],
            ),
    );
  }
}
