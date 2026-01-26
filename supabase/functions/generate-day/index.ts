import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface GenerateDayRequest {
  date?: string; // ISO date string, defaults to today
  backlog_tasks?: Array<{
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    estimated_duration?: number; // minutes
  }>;
}

interface AIBlock {
  start: string;
  end: string;
  title: string;
  type: 'event' | 'task' | 'break' | 'focus_block';
  reason?: string;
  description?: string;
}

serve(async req => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check AI entitlement
    const { data: entitlement, error: entitlementError } = await supabase.rpc(
      'check_ai_entitlement',
      { user_uuid: user.id }
    );

    if (entitlementError || !entitlement) {
      return new Response(
        JSON.stringify({
          error: 'AI features not available',
          message: 'You need AI enabled or credits to use this feature',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: GenerateDayRequest = await req.json();
    const targetDate = body.date ? new Date(body.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'timezone, working_hours_start, working_hours_end, focus_block_duration'
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to load user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get today's events
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get user's calendars first
    const { data: userCalendars, error: calendarsError } = await supabase
      .from('calendars')
      .select('id')
      .eq('owner_id', user.id);

    if (calendarsError || !userCalendars || userCalendars.length === 0) {
      return new Response(JSON.stringify({ error: 'No calendars found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const calendarIds = userCalendars.map(c => c.id);

    // Get today's events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, start, "end", status')
      .in('calendar_id', calendarIds)
      .gte('start', dayStart.toISOString())
      .lte('start', dayEnd.toISOString())
      .eq('status', 'scheduled')
      .order('start', { ascending: true });

    if (eventsError) {
      return new Response(JSON.stringify({ error: 'Failed to load events' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get backlog tasks (for now, we'll use the provided backlog or empty array)
    const backlogTasks = body.backlog_tasks || [];

    // Prepare AI prompt
    const workingHoursStart = profile.working_hours_start || '09:00:00';
    const workingHoursEnd = profile.working_hours_end || '17:00:00';
    const focusBlockDuration = profile.focus_block_duration || 90;

    // For now, use a rule-based approach (can be replaced with actual AI)
    // This generates a schedule based on existing events and backlog
    const blocks: AIBlock[] = [];
    const conflicts: string[] = [];
    const notes: string[] = [];

    // Convert existing events to blocks
    const existingBlocks: AIBlock[] = (events || []).map((event: any) => ({
      start: event.start,
      end: event.end,
      title: event.title,
      type: 'event' as const,
      description: event.description,
    }));

    // Generate schedule for backlog tasks
    let currentTime = new Date(targetDate);
    const [startHour, startMinute] = workingHoursStart.split(':').map(Number);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const [endHour, endMinute] = workingHoursEnd.split(':').map(Number);
    const dayEndTime = new Date(targetDate);
    dayEndTime.setHours(endHour, endMinute, 0, 0);

    // Sort backlog by priority
    const sortedTasks = [...backlogTasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (
        (priorityOrder[b.priority || 'medium'] || 2) -
        (priorityOrder[a.priority || 'medium'] || 2)
      );
    });

    for (const task of sortedTasks) {
      const duration = task.estimated_duration || 60; // Default 60 minutes
      const taskStart = new Date(currentTime);
      const taskEnd = new Date(taskStart);
      taskEnd.setMinutes(taskEnd.getMinutes() + duration);

      // Check if task fits in working hours
      if (taskEnd > dayEndTime) {
        conflicts.push(`Task "${task.title}" doesn't fit in working hours`);
        notes.push(`Consider scheduling "${task.title}" for another day`);
        continue;
      }

      // Check for conflicts with existing events
      const hasConflict = existingBlocks.some(block => {
        const blockStart = new Date(block.start);
        const blockEnd = new Date(block.end);
        return (
          (taskStart >= blockStart && taskStart < blockEnd) ||
          (taskEnd > blockStart && taskEnd <= blockEnd) ||
          (taskStart <= blockStart && taskEnd >= blockEnd)
        );
      });

      if (hasConflict) {
        // Try to find next available slot
        let slotFound = false;
        for (const block of existingBlocks) {
          const blockEnd = new Date(block.end);
          if (blockEnd < dayEndTime) {
            const nextStart = new Date(blockEnd);
            const nextEnd = new Date(nextStart);
            nextEnd.setMinutes(nextEnd.getMinutes() + duration);

            if (nextEnd <= dayEndTime) {
              const nextConflict = existingBlocks.some(b => {
                const bStart = new Date(b.start);
                const bEnd = new Date(b.end);
                return (
                  (nextStart >= bStart && nextStart < bEnd) ||
                  (nextEnd > bStart && nextEnd <= bEnd)
                );
              });

              if (!nextConflict) {
                currentTime = nextStart;
                slotFound = true;
                break;
              }
            }
          }
        }

        if (!slotFound) {
          conflicts.push(`Could not find slot for: ${task.title}`);
          continue;
        }
      }

      // Add task block
      blocks.push({
        start: taskStart.toISOString(),
        end: taskEnd.toISOString(),
        title: task.title,
        type: 'task',
        description: task.description,
        reason: `Scheduled based on priority: ${task.priority || 'medium'}`,
      });

      currentTime = new Date(taskEnd);
      // Add 15-minute buffer
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    // Combine existing events and new blocks, sort by start time
    const allBlocks = [...existingBlocks, ...blocks].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // Add breaks between long blocks
    const blocksWithBreaks: AIBlock[] = [];
    for (let i = 0; i < allBlocks.length; i++) {
      blocksWithBreaks.push(allBlocks[i]);

      if (i < allBlocks.length - 1) {
        const currentEnd = new Date(allBlocks[i].end);
        const nextStart = new Date(allBlocks[i + 1].start);
        const gapMinutes =
          (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

        if (gapMinutes > 30 && gapMinutes < 120) {
          // Add a break
          const breakEnd = new Date(currentEnd);
          breakEnd.setMinutes(breakEnd.getMinutes() + 15);
          blocksWithBreaks.push({
            start: currentEnd.toISOString(),
            end: breakEnd.toISOString(),
            title: 'Break',
            type: 'break',
            reason: 'Scheduled break between tasks',
          });
        }
      }
    }

    // Save AI action to database
    const { data: aiAction, error: aiActionError } = await supabase
      .from('ai_actions')
      .insert({
        user_id: user.id,
        action_type: 'generate_day',
        input: {
          date: targetDate.toISOString(),
          backlog_tasks: backlogTasks,
        },
        output: {
          blocks: blocksWithBreaks,
          conflicts,
          notes,
        },
        status: 'draft',
      })
      .select()
      .single();

    if (aiActionError) {
      console.error('Error saving AI action:', aiActionError);
      // Continue anyway - return the result
    }

    return new Response(
      JSON.stringify({
        action_id: aiAction?.id || null,
        blocks: blocksWithBreaks,
        conflicts,
        notes,
        existing_events: existingBlocks.length,
        new_blocks: blocks.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-day function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
