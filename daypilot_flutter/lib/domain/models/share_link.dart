class ShareLink {
  const ShareLink({
    required this.id,
    required this.eventId,
    required this.token,
    this.expiresAt,
    this.revoked = false,
  });

  final String id;
  final String eventId;
  final String token;
  final DateTime? expiresAt;
  final bool revoked;
}
