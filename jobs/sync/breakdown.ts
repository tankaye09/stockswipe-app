// Plain-English breakdowns for real stocks, written by Claude from the
// company's own description. Each stock is written once and saved, so the
// app never calls Claude itself. The key lives only in GitHub secrets.
import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { StockRow } from '../../src/data/live/rows';
import { clip } from './transform';

export const DEFAULT_MODEL = 'claude-opus-5-5';
/** Claude calls running at once. */
export const POOL_SIZE = 6;
/** This many failures in a row means the key or account is the problem; stop for this run. */
export const MAX_FAILS_IN_A_ROW = 5;

export const LIMITS = {
  oneLiner: 120,
  whatTheyDo: 360,
  howTheyMakeMoney: 360,
  whyPeopleWatch: 300,
  risksToKnow: 360,
} as const;

const Schema = z.object({
  oneLiner: z.string(),
  whatTheyDo: z.string(),
  howTheyMakeMoney: z.string(),
  whyPeopleWatch: z.string(),
  risksToKnow: z.string(),
});

export type Breakdown = z.infer<typeof Schema>;

export interface BreakdownWriter {
  write(row: StockRow): Promise<Breakdown | null>;
}

export const SYSTEM = `You write short, plain-English explainers of listed companies for Haystack, an app that helps new investors in Singapore learn about stocks.

Write for someone with no finance background: short sentences, everyday words, and a quick explanation of any term you can't avoid. Base what you write on the description given, plus well-known public facts about the company. If you are unsure of something, stay general rather than guess.

The app explains and never recommends. Never say or hint whether to buy, sell or hold, never predict the share price, and never call the stock cheap, expensive, undervalued or overvalued.

Fields:
- oneLiner: one sentence on what the company is, under ${LIMITS.oneLiner} characters.
- whatTheyDo: 2-3 sentences on what the company does and for whom.
- howTheyMakeMoney: 2-3 sentences on its main sources of revenue.
- whyPeopleWatch: 1-2 sentences on what investors tend to follow about it, such as a growth area, its dividend or how its business moves with the economy. Neutral, not a pitch.
- risksToKnow: 2-3 sentences on the main risks to the business.
Keep each of the last four under 300 characters.`;

/** Phrases that would turn an explainer into a verdict. A breakdown with any of them is thrown away. */
const VERDICT =
  /\b(you should|we recommend|(strong |a )?(buy|sell|hold) (rating|signal|now)|undervalued|overvalued|price target|good time to (buy|sell)|worth buying)\b/i;

export function hasVerdict(b: Breakdown): boolean {
  return Object.values(b).some((text) => VERDICT.test(text));
}

const money = (n: number, currency: string) =>
  n >= 1e9 ? `${currency} ${(n / 1e9).toFixed(1)} billion` : `${currency} ${Math.round(n / 1e6)} million`;

/** The facts Claude gets about one stock. */
export function facts(row: StockRow): string {
  return [
    `Company: ${row.name}`,
    `Ticker: ${row.symbol} (${row.market === 'US' ? 'US-listed' : 'listed on SGX in Singapore'})`,
    row.sector && `Sector: ${row.sector}`,
    row.industry && `Industry: ${row.industry}`,
    row.market_cap > 0 && `Market value: about ${money(row.market_cap, row.currency)}`,
    row.dividend_yield != null && `Dividend yield: ${row.dividend_yield}%`,
    `Description: ${row.description.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Trims each part to its length limit. */
export function tidy(b: Breakdown): Breakdown {
  const out = { ...b };
  for (const key of Object.keys(LIMITS) as (keyof Breakdown)[]) out[key] = clip(b[key].trim(), LIMITS[key]);
  return out;
}

export function claudeWriter(client: Anthropic, model: string = DEFAULT_MODEL): BreakdownWriter {
  return {
    async write(row) {
      const res = await client.messages.parse({
        model,
        max_tokens: 4000,
        output_config: { effort: 'low', format: zodOutputFormat(Schema) },
        system: SYSTEM,
        messages: [{ role: 'user', content: facts(row) }],
      });
      const b = res.stop_reason === 'end_turn' ? res.parsed_output : null;
      return b && !hasVerdict(b) ? tidy(b) : null;
    },
  };
}

/** Stocks to write next: ones with a description and no breakdown yet, biggest first. */
export function needsBreakdown(rows: StockRow[], limit: number): StockRow[] {
  return rows
    .filter((r) => !r.breakdown_at && r.sector && r.description.trim())
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, limit);
}

export function applyBreakdown(row: StockRow, b: Breakdown, nowIso: string): StockRow {
  return {
    ...row,
    one_liner: b.oneLiner,
    what_they_do: b.whatTheyDo,
    how_they_make_money: b.howTheyMakeMoney,
    why_people_watch: b.whyPeopleWatch,
    risks_to_know: b.risksToKnow,
    breakdown_at: nowIso,
  };
}

/**
 * Writes breakdowns for `rows`, a few at a time, and hands each one to `save`.
 * Returns how many were written. Stops early after several failures in a row.
 */
export async function writeBreakdowns(
  rows: StockRow[],
  writer: BreakdownWriter,
  save: (row: StockRow, b: Breakdown) => void,
  log: (m: string) => void,
): Promise<number> {
  let next = 0;
  let written = 0;
  let failsInARow = 0;
  const worker = async () => {
    while (next < rows.length && failsInARow < MAX_FAILS_IN_A_ROW) {
      const row = rows[next++];
      try {
        const b = await writer.write(row);
        failsInARow = 0;
        if (b) {
          save(row, b);
          written += 1;
        } else log(`breakdown skipped for ${row.id}`);
      } catch (e) {
        failsInARow += 1;
        if (failsInARow === MAX_FAILS_IN_A_ROW)
          log(`breakdowns: ${failsInARow} failures in a row (${String(e)}), stopping until the next run`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(POOL_SIZE, rows.length) }, worker));
  return written;
}
