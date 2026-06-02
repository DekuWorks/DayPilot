-- Realtime + attendee RSVP policies for Flutter mobile

-- Enable Realtime on events (Flutter RealtimeService)
alter publication supabase_realtime add table public.events;

-- Signed-in guests can read/update their own attendee row (RSVP flow)
drop policy if exists "Attendees can view own rows" on attendees;
create policy "Attendees can view own rows"
  on attendees for select
  using (
    email = (select email from auth.users where id = auth.uid())
  );

drop policy if exists "Attendees can update own RSVP" on attendees;
create policy "Attendees can update own RSVP"
  on attendees for update
  using (
    email = (select email from auth.users where id = auth.uid())
  )
  with check (
    email = (select email from auth.users where id = auth.uid())
  );
