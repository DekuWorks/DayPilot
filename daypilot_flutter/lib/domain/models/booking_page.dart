/// Public scheduling page metadata (slug used in `/book/:slug` routes).
class BookingPage {
  const BookingPage({
    required this.id,
    required this.slug,
    required this.title,
    this.ownerId,
    this.description,
    this.isPublished = false,
  });

  final String id;
  final String slug;
  final String title;
  final String? description;
  final String? ownerId;
  final bool isPublished;
}
