import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

export type SuggestedEvent = {
  title: string;
  start: string;
  end: string;
  description?: string;
};

type AiProvider = 'openai' | 'openai-compatible' | 'anthropic';

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getProvider(): AiProvider | null {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ?? 'openai'
    ).toLowerCase();
    if (
      provider === 'anthropic' &&
      this.config.get<string>('ANTHROPIC_API_KEY')
    )
      return 'anthropic';
    if (
      provider === 'openai-compatible' &&
      this.config.get<string>('OPENAI_BASE_URL') &&
      this.config.get<string>('OPENAI_API_KEY')
    )
      return 'openai-compatible';
    if (this.config.get<string>('OPENAI_API_KEY'))
      return provider === 'openai-compatible' ? 'openai-compatible' : 'openai';
    return null;
  }

  private async getCompletion(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider) {
      throw new BadRequestException(
        'AI scheduling is not configured. Set OPENAI_API_KEY (or OPENAI_BASE_URL for OpenAI-compatible APIs), or ANTHROPIC_API_KEY and AI_PROVIDER=anthropic.',
      );
    }

    if (provider === 'anthropic') {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      const client = new Anthropic({ apiKey });
      const model =
        this.config.get<string>('ANTHROPIC_MODEL') ??
        'claude-3-5-haiku-20241022';
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const textBlock = message.content.find((b) => b.type === 'text');
      const text =
        textBlock && 'text' in textBlock
          ? (textBlock as { text: string }).text
          : '';
      return text.trim();
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY')!;
    const baseURL =
      provider === 'openai-compatible'
        ? this.config.get<string>('OPENAI_BASE_URL')
        : undefined;
    const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  }

  async suggestSchedule(
    userId: string,
    prompt: string,
  ): Promise<{ suggestions: SuggestedEvent[] }> {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const existing = await this.prisma.event.findMany({
      where: {
        userId,
        start: { gte: now },
        end: { lte: weekEnd },
      },
      orderBy: { start: 'asc' },
      select: { title: true, start: true, end: true },
    });
    const existingStr =
      existing.length === 0
        ? 'No existing events in the next 7 days.'
        : existing
            .map(
              (e) =>
                `- ${e.title}: ${e.start.toISOString()} to ${e.end.toISOString()}`,
            )
            .join('\n');

    const systemPrompt = `You are a scheduling assistant. The user will describe what they want to schedule in natural language (e.g. "2 hours for deep work tomorrow morning", "Lunch with Sarah Friday at 12:30").
Current time: ${now.toISOString()}.
Existing events in the next 7 days (do not double-book; suggest times that fit around these):
${existingStr}

Respond with ONLY a valid JSON object with one key "suggestions" whose value is an array of events. Each event: "title" (string), "start" (ISO 8601 datetime), "end" (ISO 8601 datetime), optional "description" (string).
Example: {"suggestions":[{"title":"Deep work","start":"2025-02-22T09:00:00.000Z","end":"2025-02-22T11:00:00.000Z","description":"Focus time"}]}`;

    const content = await this.getCompletion(systemPrompt, prompt);
    if (!content) {
      return { suggestions: [] };
    }
    try {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed.events ?? parsed.suggestions ?? []);
      const suggestions: SuggestedEvent[] = arr
        .filter(
          (e: unknown) =>
            e &&
            typeof e === 'object' &&
            'title' in e &&
            'start' in e &&
            'end' in e &&
            typeof (e as SuggestedEvent).title === 'string' &&
            typeof (e as SuggestedEvent).start === 'string' &&
            typeof (e as SuggestedEvent).end === 'string',
        )
        .map((e: SuggestedEvent & { description?: string }) => ({
          title: e.title,
          start: e.start,
          end: e.end,
          description: e.description,
        }));
      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  }
}
