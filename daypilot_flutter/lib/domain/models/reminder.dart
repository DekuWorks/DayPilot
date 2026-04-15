class Reminder {
  const Reminder({
    required this.id,
    required this.eventId,
    required this.fireAt,
    this.channel = ReminderChannel.notification,
  });

  final String id;
  final String eventId;
  final DateTime fireAt;
  final ReminderChannel channel;
}

enum ReminderChannel { notification, email }
