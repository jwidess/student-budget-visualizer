import { useState } from 'react';
import { CashBalanceChart } from '@/components/charts/CashBalanceChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { SummaryCards, WarningBanner } from '@/components/dashboard/SummaryCards';
import { InitialBalanceForm } from '@/components/inputs/InitialBalanceForm';
import { IncomeForm } from '@/components/inputs/IncomeForm';
import { OneTimeIncomeForm } from '@/components/inputs/OneTimeIncomeForm';
import { RecurringExpenseForm } from '@/components/inputs/RecurringExpenseForm';
import { OneTimeExpenseForm } from '@/components/inputs/OneTimeExpenseForm';
import { FoodBudgetForm } from '@/components/inputs/FoodBudgetForm';
import { TransportForm } from '@/components/inputs/TransportForm';
import { useBudgetStore } from '@/store/budgetStore';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  UtensilsCrossed,
  MapPin,
} from 'lucide-react';

type Section = 'general' | 'income' | 'one-time-income' | 'expenses' | 'one-time-expenses' | 'food' | 'transport';

interface InputSectionProps {
  id: Section;
  title: string;
  icon: React.ReactNode;
  openSections: Set<Section>;
  onToggle: (id: Section) => void;
  children: React.ReactNode;
}

function InputSection({ id, title, icon, openSections, onToggle, children }: InputSectionProps) {
  const isOpen = openSections.has(id);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function App() {
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['general']));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const resetAll = useBudgetStore((s) => s.resetAll);

  const toggle = (id: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Student Budget Calculator
              </h1>
              <p className="text-xs text-muted-foreground">
                Project your finances, visualize your future
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <WarningBanner />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-accent transition-colors lg:hidden"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              title="Reset all data to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full">
        {/* Sidebar - Inputs */}
        <aside
          className={`border-r bg-card overflow-y-auto transition-all duration-200 ${
            sidebarOpen ? 'w-80 min-w-[320px]' : 'w-0 min-w-0 overflow-hidden'
          }`}
        >
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Budget Inputs
            </p>
          </div>

          <InputSection
            id="general"
            title="General Settings"
            icon={<DollarSign className="w-4 h-4 text-blue-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <InitialBalanceForm />
          </InputSection>

          <InputSection
            id="income"
            title="Recurring Income"
            icon={<TrendingUp className="w-4 h-4 text-green-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <IncomeForm />
          </InputSection>

          <InputSection
            id="one-time-income"
            title="One-Time Income"
            icon={<Calendar className="w-4 h-4 text-green-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <OneTimeIncomeForm />
          </InputSection>

          <InputSection
            id="expenses"
            title="Monthly Expenses"
            icon={<TrendingDown className="w-4 h-4 text-red-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <RecurringExpenseForm />
          </InputSection>

          <InputSection
            id="food"
            title="Food Budget"
            icon={<UtensilsCrossed className="w-4 h-4 text-orange-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <FoodBudgetForm />
          </InputSection>

          <InputSection
            id="transport"
            title="Commuting"
            icon={<MapPin className="w-4 h-4 text-blue-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <TransportForm />
          </InputSection>

          <InputSection
            id="one-time-expenses"
            title="One-Time Expenses"
            icon={<Calendar className="w-4 h-4 text-red-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <OneTimeExpenseForm />
          </InputSection>
        </aside>

        {/* Dashboard */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toggle sidebar on desktop */}
          <div className="hidden lg:block">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
          </div>

          <SummaryCards />

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <CashBalanceChart />
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <IncomeExpenseChart />
          </div>
        </main>
      </div>
    </div>
  );
}
