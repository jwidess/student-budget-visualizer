import { useState, memo, useRef, useCallback, useEffect } from 'react';
import { CashBalanceChart } from '@/components/charts/CashBalanceChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { SummaryCards, WarningBanner, OutOfRangeBanner, useOutOfRangeDetection } from '@/components/dashboard/SummaryCards';
import { InitialBalanceForm } from '@/components/inputs/InitialBalanceForm';
import { IncomeForm } from '@/components/inputs/IncomeForm';
import { OneTimeIncomeForm } from '@/components/inputs/OneTimeIncomeForm';
import { RecurringExpenseForm } from '@/components/inputs/RecurringExpenseForm';
import { OneTimeExpenseForm } from '@/components/inputs/OneTimeExpenseForm';
import { FoodBudgetForm } from '@/components/inputs/FoodBudgetForm';
import { TransportForm } from '@/components/inputs/TransportForm';
import { RotateDevicePrompt } from '@/components/RotateDevicePrompt';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HelpModal } from '@/components/HelpModal';
import { useBudgetStore } from '@/store/budgetStore';
import { budgetTemplates } from '@/store/templates';
import { WEEKDAYS_PER_MONTH, WEEKEND_DAYS_PER_MONTH, WEEKS_PER_MONTH } from '@/lib/constants';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
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
  FileText,
} from 'lucide-react';

type Section = 'general' | 'income' | 'one-time-income' | 'expenses' | 'one-time-expenses' | 'food' | 'transport';

interface InputSectionProps {
  id: Section;
  title: string;
  icon: React.ReactNode;
  openSections: Set<Section>;
  onToggle: (id: Section) => void;
  children: React.ReactNode;
  hasWarning?: boolean;
  isInactive?: boolean;
  summaryAmount?: number;
}

function InputSection({ id, title, icon, openSections, onToggle, children, hasWarning, isInactive, summaryAmount }: InputSectionProps) {
  const isOpen = openSections.has(id);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent hover:shadow-sm transition-all cursor-pointer ${
          hasWarning ? 'bg-orange-100 border-l-4 border-l-orange-500' : ''
        } ${
          isInactive ? 'opacity-50 bg-gray-100' : ''
        }`}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {summaryAmount !== undefined && (
          <span className="text-xs italic text-slate-600">
            ${summaryAmount.toFixed(2)}/mo
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`section-content-wrapper ${isOpen ? 'open' : ''}`}>
        <div className="section-content-inner">
          <div className="px-4 pb-4 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

const MemoizedCharts = memo(function MemoizedCharts() {
  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <CashBalanceChart />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <IncomeExpenseChart />
      </div>
    </>
  );
});

export default function App() {
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['general']));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'default' | 'danger';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const resetAll = useBudgetStore((s) => s.resetAll);
  const applyTemplate = useBudgetStore((s) => s.applyTemplate);
  const hasUserEdits = useBudgetStore((s) => s.hasUserEdits);
  const mainRef = useRef<HTMLElement>(null);

  // Get state for determining if sections are inactive
  const recurringIncomes = useBudgetStore((s) => s.recurringIncomes);
  const oneTimeIncomes = useBudgetStore((s) => s.oneTimeIncomes);
  const oneTimeExpenses = useBudgetStore((s) => s.oneTimeExpenses);
  const recurringExpenses = useBudgetStore((s) => s.recurringExpenses);
  const foodBudget = useBudgetStore((s) => s.foodBudget);
  const transportConfig = useBudgetStore((s) => s.transportConfig);

  // Use centralized out-of-range detection
  const { hasOutOfRangeRecurring, hasOutOfRangeIncomes, hasOutOfRangeExpenses } = useOutOfRangeDetection();

  // Calculate summary amounts for section headers
  const monthlyExpensesTotal = recurringExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const weekdayFoodDaily =
    foodBudget.weekdayBreakfast +
    foodBudget.weekdayLunch +
    foodBudget.weekdayDinner +
    foodBudget.weekdaySnacks;
  const monthlyFoodCost = foodBudget.enabled
    ? weekdayFoodDaily * WEEKDAYS_PER_MONTH + foodBudget.weekendDailyTotal * WEEKEND_DAYS_PER_MONTH
    : 0;

  const weekdayFuelCost =
    transportConfig.autoMpg > 0
      ? (transportConfig.autoWeekdayMiles / transportConfig.autoMpg) *
        transportConfig.autoFuelCostPerGallon
      : 0;
  const weekendFuelCost =
    transportConfig.autoMpg > 0
      ? (transportConfig.autoWeekendMiles / transportConfig.autoMpg) *
        transportConfig.autoFuelCostPerGallon
      : 0;
  const monthlyAutoTransport =
    weekdayFuelCost * WEEKDAYS_PER_MONTH + weekendFuelCost * WEEKEND_DAYS_PER_MONTH;
  const monthlyPublicTransport = transportConfig.publicWeeklyCost * WEEKS_PER_MONTH;
  const monthlyCommutingCost = transportConfig.enabled
    ? (transportConfig.autoEnabled ? monthlyAutoTransport : 0) +
      (transportConfig.publicEnabled ? monthlyPublicTransport : 0)
    : 0;

  // Freeze the main content width during sidebar animation so
  // ResponsiveContainer doesn't re-render charts on every frame.
  const toggleSidebar = useCallback(() => {
    const main = mainRef.current;
    if (main) {
      main.style.width = `${main.getBoundingClientRect().width}px`;
      main.style.flex = 'none';
    }
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarTransitionEnd = useCallback((e: React.TransitionEvent) => {
    // Only respond to the sidebar's own width transition, not children
    if (e.propertyName !== 'width') return;
    const main = mainRef.current;
    if (main) {
      main.style.width = '';
      main.style.flex = '';
    }
  }, []);

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

  // Close template menu when clicking outside
  useEffect(() => {
    if (!templateMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.template-menu-container')) {
        setTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [templateMenuOpen]);

  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={100}>
      <RotateDevicePrompt />
      <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Student Budget Visualizer
              </h1>
              <p className="text-xs text-muted-foreground">
                Project your finances, visualize your future
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <WarningBanner />
            <OutOfRangeBanner />
            <button
              onClick={() => {
                if (!hasUserEdits) {
                  resetAll();
                } else {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Reset All Data',
                    message: 'Are you sure you want to reset all data to defaults? This cannot be undone.',
                    variant: 'danger',
                    onConfirm: () => {
                      resetAll();
                      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                    },
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer"
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
          className={`border-r bg-card overflow-hidden transition-[width,min-width] duration-200 will-change-[width] ${
            sidebarOpen ? 'w-80 min-w-[320px]' : 'w-0 min-w-0'
          }`}
          onTransitionEnd={handleSidebarTransitionEnd}
        >
          <div className="w-80 h-full overflow-y-auto scrollbar-hide">
          <div className="sticky top-0 bg-white border-b px-2 py-3 z-10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-s font-semibold text-muted-foreground uppercase tracking-wider">
                Budget Inputs
              </p>

              {/* vertical divider */}
              <div className="hidden sm:block h-6 w-px bg-gray-500" role="separator" aria-orientation="vertical" />

              <div className="relative template-menu-container">
                <button
                  onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 hover:shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-3 h-3" />
                  <span>Load Template</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${templateMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {templateMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-input rounded-md shadow-xl z-[100] max-h-80 overflow-y-auto w-64">
                    {budgetTemplates.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          if (!hasUserEdits) {
                            applyTemplate(template.config);
                            setTemplateMenuOpen(false);
                          } else {
                            setConfirmDialog({
                              isOpen: true,
                              title: `Load "${template.name}" Template?`,
                              message: 'This will replace all current values. Are you sure?',
                              onConfirm: () => {
                                applyTemplate(template.config);
                                setTemplateMenuOpen(false);
                                setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                              },
                            });
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 transition-colors cursor-pointer bg-white"
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            hasWarning={hasOutOfRangeRecurring}
            isInactive={recurringIncomes.length === 0}
          >
            <IncomeForm />
          </InputSection>

          <InputSection
            id="one-time-income"
            title="One-Time Income"
            icon={<Calendar className="w-4 h-4 text-green-500" />}
            openSections={openSections}
            onToggle={toggle}
            hasWarning={hasOutOfRangeIncomes}
            isInactive={oneTimeIncomes.length === 0}
          >
            <OneTimeIncomeForm />
          </InputSection>

          <InputSection
            id="one-time-expenses"
            title="One-Time Expenses"
            icon={<Calendar className="w-4 h-4 text-red-500" />}
            openSections={openSections}
            onToggle={toggle}
            hasWarning={hasOutOfRangeExpenses}
            isInactive={oneTimeExpenses.length === 0}
          >
            <OneTimeExpenseForm />
          </InputSection>

          <InputSection
            id="expenses"
            title="Monthly Expenses"
            icon={<TrendingDown className="w-4 h-4 text-red-500" />}
            openSections={openSections}
            onToggle={toggle}
            isInactive={recurringExpenses.length === 0}
            summaryAmount={monthlyExpensesTotal}
          >
            <RecurringExpenseForm />
          </InputSection>

          <InputSection
            id="food"
            title="Food Budget"
            icon={<UtensilsCrossed className="w-4 h-4 text-orange-500" />}
            openSections={openSections}
            onToggle={toggle}
            isInactive={!foodBudget.enabled}
            summaryAmount={monthlyFoodCost}
          >
            <FoodBudgetForm />
          </InputSection>

          <InputSection
            id="transport"
            title="Commuting"
            icon={<MapPin className="w-4 h-4 text-blue-500" />}
            openSections={openSections}
            onToggle={toggle}
            isInactive={!transportConfig.enabled}
            summaryAmount={monthlyCommutingCost}
          >
            <TransportForm />
          </InputSection>
          </div>
        </aside>

        {/* Dashboard */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          <SummaryCards />

          <MemoizedCharts />
        </main>
      </div>

      {/* Help Modal */}
      <HelpModal />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        variant={confirmDialog.variant}
      />
    </div>
    </TooltipPrimitive.Provider>
  );
}
