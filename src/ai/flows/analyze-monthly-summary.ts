'use server';

/**
 * @fileOverview An AI agent that analyzes monthly financial summaries for anomalies and inconsistencies.
 *
 * - analyzeMonthlySummary - A function that analyzes the monthly summary and flags any anomalies.
 * - AnalyzeMonthlySummaryInput - The input type for the analyzeMonthlySummary function.
 * - AnalyzeMonthlySummaryOutput - The return type for the analyzeMonthlySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMonthlySummaryInputSchema = z.object({
  summaryText: z
    .string()
    .describe('A detailed text summary of the monthly financial activity.'),
  lastMonthSummaryText: z
    .string()
    .optional()
    .describe('A detailed text summary of the previous month financial activity.'),
  budgetedIncome: z.number().describe('The total budgeted income for the month.'),
  actualIncome: z.number().describe('The actual total income for the month.'),
  budgetedExpenses: z.number().describe('The total budgeted expenses for the month.'),
  actualExpenses: z.number().describe('The actual total expenses for the month.'),
});
export type AnalyzeMonthlySummaryInput = z.infer<typeof AnalyzeMonthlySummaryInputSchema>;

const AnalyzeMonthlySummaryOutputSchema = z.object({
  anomalies: z
    .array(z.string())
    .describe(
      'A list of strings describing any unusual transactions, budget inconsistencies, or other anomalies detected in the summary.'
    ),
  isConsistent: z.boolean().describe('Whether the budget is consistent with past budgets.'),
});
export type AnalyzeMonthlySummaryOutput = z.infer<typeof AnalyzeMonthlySummaryOutputSchema>;

export async function analyzeMonthlySummary(input: AnalyzeMonthlySummaryInput): Promise<AnalyzeMonthlySummaryOutput> {
  return analyzeMonthlySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMonthlySummaryPrompt',
  input: {schema: AnalyzeMonthlySummaryInputSchema},
  output: {schema: AnalyzeMonthlySummaryOutputSchema},
  prompt: `You are an expert financial analyst specializing in detecting anomalies and inconsistencies in financial reports.

You are analyzing the monthly financial summary for Studio De Vecchi & Mapelli, a dental practice.

Your goal is to identify any unusual transactions, budget inconsistencies, or other potential issues that require further investigation.

Here's the monthly financial summary:

Summary: {{{summaryText}}}

Last Month Summary (if available): {{{lastMonthSummaryText}}}

Budgeted Income: {{{budgetedIncome}}}
Actual Income: {{{actualIncome}}}
Budgeted Expenses: {{{budgetedExpenses}}}
Actual Expenses: {{{actualExpenses}}}

Based on this information, please identify any anomalies or inconsistencies and set the isConsistent output field appropriately.
If there is not enough data to determine whether there are any anomalies, return an empty list for anomalies and isConsistent true.
`,
});

const analyzeMonthlySummaryFlow = ai.defineFlow(
  {
    name: 'analyzeMonthlySummaryFlow',
    inputSchema: AnalyzeMonthlySummaryInputSchema,
    outputSchema: AnalyzeMonthlySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
