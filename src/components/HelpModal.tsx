import * as Dialog from '@radix-ui/react-dialog';
import { HelpCircle, X, DollarSign, UtensilsCrossed, MapPin, TrendingDown, TrendingUp, Calendar } from 'lucide-react';

export function HelpModal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="fixed bottom-5 right-5 z-[100] w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 z-[201] grid place-items-center overflow-y-auto p-4">
          <Dialog.Content className="dialog-content max-w-2xl w-full rounded-lg border border-border bg-white shadow-2xl my-8">

            {/* Header */}
            <div className="relative px-6 py-4 border-b border-border">
              <Dialog.Title className="text-lg font-semibold pr-8">
                Help Guide
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto text-sm text-muted-foreground leading-relaxed">
              <Dialog.Description asChild>
                <div className="space-y-6">

                  {/* Overview */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      Overview
                    </h3>
                    <p>
                      This site projects your daily cash balance into the future based on your income, expenses, and spending habits.
                      It runs a <strong>day-by-day simulation</strong> starting from today and extending out for the number of months you choose.
                      Each day, income is added and expenses are subtracted to produce a running balance.
                    </p>
                    <p className="mt-2">
                      Use the sidebar "Budget Inputs" to enter your income and expense details. The charts and summary cards on the dashboard will
                      update automatically as you make changes. You can also start from a preset template using the "Load Template" dropdown
                      in the header.
                    </p>
                  </section>

                  {/* Project Link */}
                  <div className="px-0">
                    <a
                      href="https://github.com/jwidess/student-budget-calculator"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View the project on GitHub here.
                    </a>
                  </div>

                  {/* Charts */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                      Charts & Dashboard
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Cash Balance Over Time</strong> — The primary chart showing your projected balance over time. Hover over points to see income and expense events for that day.</li>
                      <li><strong>Monthly Income vs Expenses</strong> — Monthly bar chart comparing total income against total expenses.</li>
                      <li><strong>Summary Cards</strong> — Short metrics including your total projected income/expenses, net, lowest balance, and a warning if your balance is projected to go negative at any point.</li>
                    </ul>
                  </section>

                  {/* Initial Balance */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      General Settings
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Current Cash on Hand</strong> — Your current bank balance. The simulation starts from this amount.</li>
                      <li><strong>Projection Length</strong> — How many months into the future to simulate (1-24 months).</li>
                    </ul>
                  </section>

                  {/* Recurring Income */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Recurring Income
                    </h3>
                    <p>
                      Add jobs or regular income sources. Each one needs:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li><strong>Hours/Week</strong> and <strong>Hourly rate</strong> — Used to compute each paycheck.</li>
                      <li><strong>Pay frequency</strong> — How often you're paid:
                        <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5">
                          <li><em>Weekly:</em> Paycheck = hours * rate</li>
                          <li><em>Biweekly:</em> Paycheck = hours * rate * 2</li>
                          <li><em>Monthly:</em> Paycheck = hours * rate * (52 ÷ 12)</li>
                        </ul>
                      </li>
                      <li><strong>First pay date</strong> — Anchor date of first paycheck. Future paydays are calculated from this date.</li>
                      <li><strong>Last pay date</strong> (optional) — If set, income stops after this date. Useful for seasonal jobs or internships.</li>
                    </ul>
                  </section>

                  {/* One-Time Income */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      One-Time Income
                    </h3>
                    <p>
                      One time deposits like tax refunds, gifts, or financial aid disbursements. Each entry adds
                      the specified amount to your balance on the exact date you choose.
                    </p>
                  </section>

                  {/* One-Time Expenses */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <Calendar className="w-4 h-4 text-red-500" />
                      One-Time Expenses
                    </h3>
                    <p>
                      Large or planned purchases that happen once — tuition, a deposit, or a concert ticket.
                      The amount is deducted from your balance on the specified date.
                    </p>
                  </section>

                  {/* Monthly Expenses */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      Monthly Expenses
                    </h3>
                    <p>
                      Bills and subscriptions that recur monthly. Each expense is deducted on the <strong>day of the month</strong> you
                      specify (1-28). For example, rent due on the 1st will be deducted every month on day 1.
                    </p>
                  </section>

                  {/* Food Budget */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                      Food Budget
                    </h3>
                    <p>
                      When enabled, food costs are deducted <strong>every day</strong> of the simulation.
                      Weekdays and weekends are calculated differently:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li><strong>Weekdays (Mon-Fri):</strong> Daily cost = Breakfast + Lunch + Dinner + Snacks</li>
                      <li><strong>Weekends (Sat-Sun):</strong> A single flat daily total you set</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      The monthly estimate shown in the sidebar header uses: (weekday cost * 5 + weekend cost * 2) * 52 ÷ 12.
                    </p>
                  </section>

                  {/* Transport */}
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 underline">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Commuting
                    </h3>
                    <p>
                      When enabled, commuting costs are deducted <strong>every day</strong>. Two modes can be used together:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>
                        <strong>Auto/Car:</strong> Daily fuel cost = (miles driven ÷ MPG) * fuel price per gallon.
                        Weekday and weekend mileage are set independently.
                      </li>
                      <li>
                        <strong>Public Transit:</strong> You enter a weekly cost, which is spread evenly across all 7 days (weekly cost ÷ 7 per day).
                      </li>
                    </ul>
                    <p className="mt-2 text-xs">
                      The monthly estimate uses the same 52-week annualization: (weekday cost * 5 + weekend cost * 2) * 52 ÷ 12 for auto,
                      and weekly cost * 52 ÷ 12 for public transit.
                    </p>
                  </section>

                </div>
              </Dialog.Description>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-gray-50 rounded-b-lg">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-white hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer">
                  Close
                </button>
              </Dialog.Close>
            </div>

          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
