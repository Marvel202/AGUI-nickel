import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";
import { CHART_CONFIG } from "@/components/config";

const statementLineSchema = z.object({
  label: z.string(),
  values: z.array(z.number()),
});

export const IncomeStatementProps = z.object({
  title: z.string().describe("Statement title"),
  description: z.string().describe("Brief statement subtitle"),
  periods: z.array(z.string()).min(1).describe("Column labels for the statement"),
  revenueLines: z.array(statementLineSchema),
  expenseLines: z.array(statementLineSchema),
  revenueTotal: z.array(z.number()),
  expenseTotal: z.array(z.number()),
  netIncome: z.array(z.number()),
  summaryChart: z.array(
    z.object({
      label: z.string(),
      revenue: z.number(),
      expenses: z.number(),
      netIncome: z.number(),
    }),
  ),
  insight: z.string().max(200).describe("AI-generated financial insight, strictly under 40 words. Rules: (1) faithfully state trends of the netIncome; (2) identify the single largest expense line by highest absolute value or % of total expenses as the key cost driver, not a smaller one; (3) describe net income as 'sustained losses', 'sustained gains', 'volatile losses', 'promising growth', etc. based on the actual pattern across periods"),
});

type IncomeStatementProps = z.infer<typeof IncomeStatementProps>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ValueCell({ value, emphasize = false }: { value: number; emphasize?: boolean }) {
  const negative = value < 0;

  return (
    <td
      className={[
        "px-3 py-2 text-right text-sm tabular-nums",
        emphasize
          ? negative
            ? "font-semibold text-red-700 "
            : "font-semibold text-zinc-950 "
          : negative
            ? "font-medium text-red-700 "
            : "font-medium text-gray-800 ",
      ].join(" ")}
    >
      {formatCurrency(value)}
    </td>
  );
}

function StatementRow({
  label,
  values,
  emphasize = false,
  indent = false,
}: {
  label: string;
  values: number[];
  emphasize?: boolean;
  indent?: boolean;
}) {
  return (
    <tr className="border-t border-zinc-200 ">
      <th
        className={[
          "px-3 py-2 text-left text-sm",
          emphasize
            ? "font-semibold text-zinc-950 "
            : "font-medium text-gray-800 ",
          indent ? "pl-7" : "",
        ].join(" ")}
      >
        {label}
      </th>
      {values.map((value, index) => (
        <ValueCell key={`${label}-${index}`} value={value} emphasize={emphasize} />
      ))}
    </tr>
  );
}

export function IncomeStatement({
  title,
  description,
  periods,
  revenueLines,
  expenseLines,
  revenueTotal,
  expenseTotal,
  netIncome,
  summaryChart,
  insight,
}: IncomeStatementProps) {
  return (
    <section className="mx-auto my-6 flex max-w-6xl flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ">
      <header className="space-y-1">
        <h3 className="text-2xl font-semibold ">{title}</h3>
        <p className="text-sm text-zinc-600">{description}</p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">AI Insight</p>
        <p className="text-sm leading-relaxed text-amber-900">{insight}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 ">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 ">
            Monthly Summary
          </h4>
          <p className="text-xs text-zinc-500">
            Revenue, expenses, and net income by month
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={summaryChart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #d4d4d8)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--chart-axis, #a1a1aa)" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--chart-axis, #a1a1aa)"
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            />
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar isAnimationActive={false} dataKey="netIncome" name="Net Income" radius={[4, 4, 0, 0]}>
              {summaryChart.map((entry) => (
                <Cell
                  key={`net-income-${entry.label}`}
                  fill={entry.netIncome < 0 ? "#dc2626" : "#16a34a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 ">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50  ">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ">
                Line Item
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 "
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-sky-100/90 ">
              <th className="px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-sky-900 ">
                Income
              </th>
              <td colSpan={periods.length} />
            </tr>
            {revenueLines.map((line) => (
              <StatementRow key={`revenue-${line.label}`} label={line.label} values={line.values} indent />
            ))}
            <StatementRow label="Total Income" values={revenueTotal} emphasize />

            <tr className="bg-orange-100/90 ">
              <th className="px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-orange-900 ">
                Expenses
              </th>
              <td colSpan={periods.length} />
            </tr>
            {expenseLines.map((line) => (
              <StatementRow key={`expense-${line.label}`} label={line.label} values={line.values} indent />
            ))}
            <StatementRow label="Total Expenses" values={expenseTotal} emphasize />
            <tr className="border-t-2 border-zinc-300 bg-zinc-50  ">
              <th className="px-3 py-3 text-left text-sm font-semibold uppercase tracking-wide text-zinc-900 ">
                Net Income
              </th>
              {netIncome.map((value, index) => (
                <ValueCell key={`net-income-${index}`} value={value} emphasize />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 ">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 ">
            Income Statement Chart
          </h4>
          <p className="text-xs text-zinc-500">
            Net income by period, with profit in green and loss in red
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={periods.map((period, index) => ({
              label: period,
              netIncome: netIncome[index],
            }))}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #d4d4d8)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--chart-axis, #a1a1aa)" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--chart-axis, #a1a1aa)"
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            />
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar isAnimationActive={false} dataKey="netIncome" name="Net Income" radius={[4, 4, 0, 0]}>
              {netIncome.map((value, index) => (
                <Cell
                  key={`bottom-net-income-${periods[index]}`}
                  fill={value < 0 ? "#dc2626" : "#16a34a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}