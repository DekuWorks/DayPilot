import { buildBookingIcs, type BookingIcsInput } from "@daypilot/lib";

export type { BookingIcsInput };
export { buildBookingIcs };

export function downloadBookingIcs(input: BookingIcsInput) {
  const ics = buildBookingIcs(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "daypilot-booking.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
