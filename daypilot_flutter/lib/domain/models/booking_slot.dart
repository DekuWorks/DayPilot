class BookingSlot {
  const BookingSlot({
    required this.id,
    required this.bookingPageId,
    required this.startsAt,
    required this.endsAt,
    this.capacity = 1,
    this.bookedCount = 0,
  });

  final String id;
  final String bookingPageId;
  final DateTime startsAt;
  final DateTime endsAt;
  final int capacity;
  final int bookedCount;

  bool get isFull => bookedCount >= capacity;
}
