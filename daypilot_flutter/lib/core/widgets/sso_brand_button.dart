import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum SsoBrand { google, apple, microsoft }

/// Official-looking SSO / calendar-connect CTA. Not a DayPilot green pill.
class SsoBrandButton extends StatelessWidget {
  const SsoBrandButton({
    super.key,
    required this.brand,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.expand = true,
  });

  final SsoBrand brand;
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final style = _styleFor(brand, isDark);
    return SizedBox(
      width: expand ? double.infinity : null,
      height: 44,
      child: Material(
        color: style.background,
        shape: StadiumBorder(side: BorderSide(color: style.border)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: busy ? null : onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (busy)
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: style.foreground,
                    ),
                  )
                else ...[
                  _SsoMark(brand: brand, color: style.foreground),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: style.foreground,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  static _SsoStyle _styleFor(SsoBrand brand, bool isDark) {
    switch (brand) {
      case SsoBrand.google:
        return const _SsoStyle(
          background: Color(0xFFFFFFFF),
          border: Color(0xFF747775),
          foreground: Color(0xFF1F1F1F),
        );
      case SsoBrand.microsoft:
        return const _SsoStyle(
          background: Color(0xFFFFFFFF),
          border: Color(0xFF8C8C8C),
          foreground: Color(0xFF5E5E5E),
        );
      case SsoBrand.apple:
        return isDark
            ? const _SsoStyle(
                background: Color(0xFFFFFFFF),
                border: Color(0xFFFFFFFF),
                foreground: Color(0xFF000000),
              )
            : const _SsoStyle(
                background: Color(0xFF000000),
                border: Color(0xFF000000),
                foreground: Color(0xFFFFFFFF),
              );
    }
  }
}

class _SsoStyle {
  const _SsoStyle({
    required this.background,
    required this.border,
    required this.foreground,
  });

  final Color background;
  final Color border;
  final Color foreground;
}

class _SsoMark extends StatelessWidget {
  const _SsoMark({required this.brand, required this.color});

  final SsoBrand brand;
  final Color color;

  @override
  Widget build(BuildContext context) {
    switch (brand) {
      case SsoBrand.google:
        return SvgPicture.asset(
          'assets/sso/google_g.svg',
          width: 18,
          height: 18,
        );
      case SsoBrand.microsoft:
        return SvgPicture.asset(
          'assets/sso/microsoft.svg',
          width: 18,
          height: 18,
        );
      case SsoBrand.apple:
        return Icon(Icons.apple, size: 20, color: color);
    }
  }
}

SsoBrand? ssoBrandForProvider(String providerId) {
  switch (providerId) {
    case 'google':
      return SsoBrand.google;
    case 'outlook':
      return SsoBrand.microsoft;
    case 'apple':
    case 'apple_eventkit':
      return SsoBrand.apple;
    default:
      return null;
  }
}

String ssoConnectLabel(String providerId, {required bool reconnect}) {
  final verb = reconnect ? 'Reconnect' : 'Connect';
  switch (providerId) {
    case 'google':
      return '$verb Google Calendar';
    case 'outlook':
      return '$verb Outlook';
    case 'apple':
    case 'apple_eventkit':
      return '$verb Apple Calendar';
    default:
      return verb;
  }
}
