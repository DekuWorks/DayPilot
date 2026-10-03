/// Public scheduling page metadata (slug used in `/book/:slug` routes).
class MeetingChoice {
  const MeetingChoice({
    required this.id,
    required this.label,
    required this.detail,
  });

  final String id;
  final String label;
  final String detail;
}

class BookingPage {
  const BookingPage({
    required this.id,
    required this.slug,
    required this.title,
    this.ownerId,
    this.description,
    this.isPublished = false,
    this.meetingChoices = const [],
  });

  final String id;
  final String slug;
  final String title;
  final String? description;
  final String? ownerId;
  final bool isPublished;
  final List<MeetingChoice> meetingChoices;
}
