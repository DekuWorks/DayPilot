import 'dart:convert';

import '../../core/config/nest_api_session.dart';

/// Pro access is an active Founding 25 or Pro plan. Older Personal, Business,
/// and Enterprise receipts still count. Prefer the API `hasProAccess` flag.
bool isPaidSubscription(Map<String, dynamic>? sub) {
  if (sub == null) return false;
  final access = sub['hasProAccess'];
  if (access is bool) return access;
  final paid = sub['paid'];
  if (paid is bool) return paid;
  final tier = '${sub['tier'] ?? 'Free'}';
  final status = '${sub['status'] ?? 'active'}';
  if (tier == 'Free') return false;
  if (status == 'canceled') {
    final end = DateTime.tryParse('${sub['currentPeriodEnd'] ?? ''}');
    return end != null && end.isAfter(DateTime.now());
  }
  return status == 'active' || status == 'trialing' || status == 'past_due';
}

Future<Map<String, dynamic>?> fetchSubscription(NestApiSession session) async {
  try {
    if (!session.hasSession) {
      await session.exchangeFromSupabaseSession();
    }
    final res = await session.get('/billing/subscription');
    if (res.statusCode >= 400) return null;
    final data = jsonDecode(res.body);
    if (data is! Map) return null;
    return Map<String, dynamic>.from(data);
  } catch (_) {
    return null;
  }
}

/// False when the account is Free or the billing API cannot be reached.
Future<bool> accountHasPaidPlan(NestApiSession session) async {
  return isPaidSubscription(await fetchSubscription(session));
}

/// Free accounts can add one external calendar. Existing connections are not
/// counted as new. Pro access removes the cap.
Future<bool> canAddCalendarConnection(
  NestApiSession session,
  int existingCount,
) async {
  final sub = await fetchSubscription(session);
  if (isPaidSubscription(sub)) return true;
  final raw = sub?['calendarConnectionLimit'];
  final limit = raw is num ? raw.toInt() : 1;
  return existingCount < limit;
}
