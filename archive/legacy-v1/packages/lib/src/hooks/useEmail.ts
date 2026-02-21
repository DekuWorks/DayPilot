import { useMutation } from '@tanstack/react-query';
import { sendEmail } from '../utils/email';
import type { EmailTemplate } from '../utils/emailTypes';

/**
 * Hook to send email
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: async (data: {
      to: string;
      template: EmailTemplate;
      options?: {
        from?: string;
        replyTo?: string;
      };
    }) => {
      return sendEmail(data.to, data.template, data.options);
    },
  });
}
