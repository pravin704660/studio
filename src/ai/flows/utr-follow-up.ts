// This is a server-side file.
'use server';

/**
 * @fileOverview This flow proactively reminds users about pending UTR payment requests older than 24 hours.
 *
 * - utrFollowUp - A function that initiates the UTR follow-up process.
 * - UTRFollowUpInput - The input type for the utrFollowUp function.
 * - UTRFollowUpOutput - The return type for the utrFollowUp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const UTRFollowUpInputSchema = z.object({
  requestId: z.string().describe('The ID of the wallet request.'),
  userId: z.string().describe('The ID of the user who made the request.'),
  amount: z.number().describe('The amount of the requested deposit.'),
  utr: z.string().describe('The UTR code provided by the user.'),
  timestamp: z.string().describe('The timestamp of the request.'),
});
export type UTRFollowUpInput = z.infer<typeof UTRFollowUpInputSchema>;

const UTRFollowUpOutputSchema = z.object({
  followUpMessage: z.string().describe('A message prompting the user to follow up on their pending UTR request.'),
});
export type UTRFollowUpOutput = z.infer<typeof UTRFollowUpOutputSchema>;

export async function utrFollowUp(input: UTRFollowUpInput): Promise<UTRFollowUpOutput> {
  return utrFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'utrFollowUpPrompt',
  input: {schema: UTRFollowUpInputSchema},
  output: {schema: UTRFollowUpOutputSchema},
  prompt: `You are a helpful assistant that reminds users to follow up on their pending UTR payment requests.

  A user submitted a wallet request with the following details:
  - Request ID: {{{requestId}}}
  - User ID: {{{userId}}}
  - Amount: {{{amount}}}
  - UTR Code: {{{utr}}}
  - Timestamp: {{{timestamp}}}

  Generate a friendly but firm reminder message to encourage the user to follow up with the admin or support team if the request has been pending for more than 24 hours. Be concise and direct.
  `,
});

const utrFollowUpFlow = ai.defineFlow(
  {
    name: 'utrFollowUpFlow',
    inputSchema: UTRFollowUpInputSchema,
    outputSchema: UTRFollowUpOutputSchema,
  },
  async input => {
    // Check if the request has been pending for more than 24 hours
    const requestTimestamp = new Date(input.timestamp).getTime();
    const now = Date.now();
    const diffInHours = (now - requestTimestamp) / (1000 * 60 * 60);

    if (diffInHours > 24) {
      const {output} = await prompt(input);
      return output!;
    } else {
      return {followUpMessage: 'No follow-up needed yet.'};
    }
  }
);
