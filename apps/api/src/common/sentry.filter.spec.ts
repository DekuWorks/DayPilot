import { HttpException } from '@nestjs/common';
import { clientErrorBody } from './sentry.filter';

describe('clientErrorBody', () => {
  it('does not return a Prisma path or SQL on a server error', () => {
    const leaked = new Error(
      'Invalid `this.prisma.planWaitlistEntry.findMany()` invocation in /Users/marcusbrown/Desktop/DayPilot/apps/api/src/founder-hub/prisma-hub.db.ts:130:54 The column `plan_waitlist.status` does not exist in the current database.',
    );
    const body = clientErrorBody(leaked, 500);
    const json = JSON.stringify(body);
    expect(body).toEqual({
      statusCode: 500,
      message: 'Something went wrong. Please try again.',
    });
    expect(json).not.toContain('prisma');
    expect(json).not.toContain('plan_waitlist');
    expect(json).not.toContain('/Users/');
  });

  it('hides a 500 HttpException message as well', () => {
    const err = new HttpException(
      'Invalid `this.prisma.planWaitlistEntry.findMany()` invocation',
      500,
    );
    expect(JSON.stringify(clientErrorBody(err, 500))).not.toContain('prisma');
  });

  it('keeps a 403 the client is meant to show', () => {
    const err = new HttpException('Only the hub owner can open this.', 403);
    expect(clientErrorBody(err, 403)).toEqual({
      message: 'Only the hub owner can open this.',
    });
  });
});
