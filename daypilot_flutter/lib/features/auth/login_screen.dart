import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/repository_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/gradient_brand_title.dart';
import '../../core/widgets/sso_brand_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _busy = false;
  bool _obscure = true;
  bool _magicMode = false;
  bool _magicSent = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final email = _email.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your email')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      if (_magicMode) {
        await ref.read(authRepositoryProvider).signInWithMagicLink(email);
        if (mounted) setState(() => _magicSent = true);
      } else {
        await ref.read(authRepositoryProvider).signInWithPassword(
              email: email,
              password: _password.text,
            );
        if (mounted) context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sign in failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DayPilotScheme.of(context).backgroundPrimary,
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.translucent,
          child: Form(
            key: _formKey,
            child: ListView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
              children: [
                const Center(
                  child: BrandLockup(markSize: 88, fontSize: 30),
                ),
                const SizedBox(height: 10),
                Text(
                  'Plan. Pilot. Perform.',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: DayPilotScheme.of(context).accent,
                        fontWeight: FontWeight.w700,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                const _FeatureRow(
                  icon: Icons.calendar_month_outlined,
                  label: 'Connected Calendars',
                ),
                const _FeatureRow(
                  icon: Icons.auto_awesome_outlined,
                  label: 'AI Scheduling',
                ),
                const _FeatureRow(
                  icon: Icons.check_circle_outline,
                  label: 'Tasks & Reminders',
                ),
                const _FeatureRow(
                  icon: Icons.insights_outlined,
                  label: 'Insights & Analytics',
                ),
                const SizedBox(height: 24),
                Text(
                  'Sign in',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: DayPilotScheme.of(context).textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: Text('Password'),
                        selected: !_magicMode,
                        onSelected: (_) => setState(() {
                          _magicMode = false;
                          _magicSent = false;
                        }),
                        selectedColor: DayPilotScheme.of(context).accent,
                        labelStyle: TextStyle(
                          color: !_magicMode
                              ? DayPilotScheme.of(context).textInverse
                              : DayPilotScheme.of(context).textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                        showCheckmark: false,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(
                        label: Text('Magic link'),
                        selected: _magicMode,
                        onSelected: (_) => setState(() {
                          _magicMode = true;
                          _magicSent = false;
                        }),
                        selectedColor: DayPilotScheme.of(context).accent,
                        labelStyle: TextStyle(
                          color: _magicMode
                              ? DayPilotScheme.of(context).textInverse
                              : DayPilotScheme.of(context).textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                        showCheckmark: false,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (_magicSent)
                  Container(
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: DayPilotScheme.of(context).accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: DayPilotScheme.of(context).accent),
                    ),
                    child: Text(
                      'Check your email for a magic link. After you open it, come back and the app will pick up your session (or sign in with password).',
                      style: TextStyle(color: DayPilotScheme.of(context).textPrimary),
                    ),
                  ),
                TextFormField(
                  controller: _email,
                  focusNode: _emailFocus,
                  enabled: !_busy,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: _magicMode
                      ? TextInputAction.done
                      : TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  autocorrect: false,
                  enableSuggestions: false,
                  style: TextStyle(color: DayPilotScheme.of(context).textPrimary),
                  onFieldSubmitted: (_) {
                    if (_magicMode) {
                      _submit();
                    } else {
                      _passwordFocus.requestFocus();
                    }
                  },
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'you@example.com',
                  ),
                ),
                if (!_magicMode) ...[
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _password,
                    focusNode: _passwordFocus,
                    enabled: !_busy,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    style: TextStyle(color: DayPilotScheme.of(context).textPrimary),
                    onFieldSubmitted: (_) => _busy ? null : _submit(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          color: DayPilotScheme.of(context).textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_magicMode ? 'Email magic link' : 'Continue'),
                ),
                const SizedBox(height: 12),
                SsoBrandButton(
                  brand: SsoBrand.google,
                  label: 'Sign in with Google',
                  busy: _busy,
                  onPressed: () async {
                    setState(() => _busy = true);
                    try {
                      await ref.read(authRepositoryProvider).signInWithGoogle();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Google sign-in failed: $e')),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
                ),
                const SizedBox(height: 12),
                SsoBrandButton(
                  brand: SsoBrand.apple,
                  label: 'Sign in with Apple',
                  busy: _busy,
                  onPressed: () async {
                    setState(() => _busy = true);
                    try {
                      await ref.read(authRepositoryProvider).signInWithApple();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Apple sign-in failed: $e')),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
                ),
                const SizedBox(height: 12),
                SsoBrandButton(
                  brand: SsoBrand.microsoft,
                  label: 'Sign in with Microsoft',
                  busy: _busy,
                  onPressed: () async {
                    setState(() => _busy = true);
                    try {
                      await ref
                          .read(authRepositoryProvider)
                          .signInWithMicrosoft();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Microsoft sign-in failed: $e'),
                          ),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
                ),
                if (!_magicMode)
                  TextButton(
                    onPressed:
                        _busy ? null : () => context.push('/forgot-password'),
                    child: Text('Forgot password'),
                  ),
                TextButton(
                  onPressed: _busy ? null : () => context.push('/signup'),
                  child: Text('Create an account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: DayPilotScheme.of(context).accent),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              color: DayPilotScheme.of(context).textSecondary,
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
