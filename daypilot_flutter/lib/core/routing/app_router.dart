/// GoRouter for DayPilot mobile.
///
/// Auth: unauthenticated users are redirected to `/login` except public routes
/// (`/book/:slug`, auth screens). Signed-in users hitting auth-only routes go
/// to `/home`. Legacy `/dashboard` redirects to `/home`.
///
/// Shell: bottom tabs use [StatefulShellRoute.indexedStack] (Home · Tasks ·
/// Insights · Profile). Home hosts the calendar. `/calendar` redirects to
/// `/home`. Secondary features are top-level routes outside the tab stack.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/billing/billing_screen.dart';
import '../../features/booking/booking_links_screen.dart';
import '../../features/booking/public_booking_screen.dart';
import '../../features/contacts/contacts_screen.dart';
import '../../features/events/event_create_screen.dart';
import '../../features/events/event_detail_screen.dart';
import '../../features/events/event_edit_screen.dart';
import '../../features/friends/friends_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/integrations/integrations_screen.dart';
import '../../features/insights/daily_brief_screen.dart';
import '../../features/insights/insights_screen.dart';
import '../../features/meetings/meetings_screen.dart';
import '../../features/notes/notes_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/projects/projects_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/sync/apple_calendar_flow_screen.dart';
import '../../features/sync/calendar_auto_connect_host.dart';
import '../../features/sync/sync_screen.dart';
import '../../features/tasks/task_detail_screen.dart';
import '../../features/tasks/tasks_screen.dart';
import '../providers/bootstrap_providers.dart';

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(supabaseAuthListenableProvider);
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/home',
    refreshListenable: refresh,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      if (loc == '/dashboard') return '/home';
      if (loc == '/calendar' || loc.startsWith('/calendar/')) {
        final view = state.uri.queryParameters['view'];
        if (view == null || view.isEmpty) return '/home';
        return '/home?view=$view';
      }
      final session = Supabase.instance.client.auth.currentSession;
      final isPublic = _isPublicRoute(loc);
      if (session == null && !isPublic) {
        return '/login';
      }
      if (session != null && _isAuthOnlyRoute(loc)) {
        return '/home';
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
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return CalendarAutoConnectHost(
            child: AppShell(navigationShell: navigationShell),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/tasks',
                builder: (context, state) => const TasksScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/insights',
                builder: (context, state) => const InsightsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/tasks/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return TaskDetailScreen(taskId: id);
        },
      ),
      GoRoute(
        path: '/notes',
        builder: (context, state) => const NotesScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return NoteEditorScreen(noteId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/projects',
        builder: (context, state) => const ProjectsScreen(),
      ),
      GoRoute(
        path: '/meetings',
        builder: (context, state) => const MeetingsScreen(),
      ),
      GoRoute(
        path: '/contacts',
        builder: (context, state) => const ContactsScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ContactDetailScreen(contactId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/friends',
        builder: (context, state) => const FriendsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/booking-links',
        builder: (context, state) => const BookingLinksScreen(),
      ),
      GoRoute(
        path: '/billing',
        builder: (context, state) => const BillingScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/integrations',
        builder: (context, state) => const IntegrationsScreen(),
      ),
      GoRoute(
        path: '/integrations/apple-calendar',
        builder: (context, state) => const AppleCalendarFlowScreen(),
      ),
      GoRoute(
        path: '/sync',
        builder: (context, state) => const SyncScreen(),
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
  );
});

bool _isPublicRoute(String location) {
  if (location.startsWith('/book/')) return true;
  return const {'/login', '/signup', '/forgot-password'}.contains(location);
}

bool _isAuthOnlyRoute(String location) {
  return const {'/login', '/signup', '/forgot-password'}.contains(location);
}
