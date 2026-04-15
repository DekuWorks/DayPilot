import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/booking/public_booking_screen.dart';
import '../../features/calendar/calendar_screen.dart';
import '../../features/events/event_detail_screen.dart';
import '../../features/events/event_edit_screen.dart';
import '../../features/events/event_create_screen.dart';
import '../../features/insights/daily_brief_screen.dart';
import '../../features/insights/insights_screen.dart';
import '../../features/shell/app_shell.dart';
import '../providers/bootstrap_providers.dart';

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(supabaseAuthListenableProvider);
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/calendar',
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loc = state.matchedLocation;
      final isPublic = _isPublicRoute(loc);
      if (session == null && !isPublic) {
        return '/login';
      }
      if (session != null && _isAuthOnlyRoute(loc)) {
        return '/calendar';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/book/:slug',
        builder: (context, state) {
          final slug = state.pathParameters['slug']!;
          return PublicBookingScreen(slug: slug);
        },
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/calendar',
            builder: (context, state) => const CalendarScreen(),
          ),
          GoRoute(
            path: '/insights',
            builder: (context, state) => const InsightsScreen(),
          ),
          GoRoute(
            path: '/insights/brief',
            builder: (context, state) => const DailyBriefScreen(),
          ),
          GoRoute(
            path: '/events/new',
            builder: (context, state) => const EventCreateScreen(),
          ),
          GoRoute(
            path: '/events/:id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return EventDetailScreen(eventId: id);
            },
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return EventEditScreen(eventId: id);
                },
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

bool _isPublicRoute(String location) {
  if (location.startsWith('/book/')) return true;
  return const {'/login', '/signup', '/forgot-password'}.contains(location);
}

bool _isAuthOnlyRoute(String location) {
  return const {'/login', '/signup', '/forgot-password'}.contains(location);
}
