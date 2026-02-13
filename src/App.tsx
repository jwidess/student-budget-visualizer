import { useState, memo, useRef, useCallback, useEffect } from 'react';
import { CashBalanceChart } from '@/components/charts/CashBalanceChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { SummaryCards, WarningBanner, OutOfRangeBanner } from '@/components/dashboard/SummaryCards';
import { InitialBalanceForm } from '@/components/inputs/InitialBalanceForm';
import { IncomeForm } from '@/components/inputs/IncomeForm';
import { OneTimeIncomeForm } from '@/components/inputs/OneTimeIncomeForm';
import { RecurringExpenseForm } from '@/components/inputs/RecurringExpenseForm';
import { OneTimeExpenseForm } from '@/components/inputs/OneTimeExpenseForm';
import { FoodBudgetForm } from '@/components/inputs/FoodBudgetForm';
import { TransportForm } from '@/components/inputs/TransportForm';
import { useBudgetStore } from '@/store/budgetStore';
import { budgetTemplates } from '@/store/templates';
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
}

function InputSection({ id, title, icon, openSections, onToggle, children }: InputSectionProps) {
  const isOpen = openSections.has(id);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent hover:shadow-sm transition-all cursor-pointer"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
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
  const resetAll = useBudgetStore((s) => s.resetAll);
  const applyTemplate = useBudgetStore((s) => s.applyTemplate);
  const mainRef = useRef<HTMLElement>(null);

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
            <OutOfRangeBanner />
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer lg:hidden"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset all data to defaults? This cannot be undone.')) {
                  resetAll();
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
          <div className="sticky top-0 bg-white border-b px-4 py-3 space-y-3 z-10">
            <div className="border-b pb-3">
              <div className="relative template-menu-container">
                <button
                  onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
                  className="w-full flex items-center justify-left gap-2 rounded-md bg-primary px-1 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Load Template</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${templateMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {templateMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-xl z-[100] max-h-80 overflow-y-auto">
                    {budgetTemplates.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          if (window.confirm(`Load "${template.name}" template? This will replace all current values.`)) {
                            applyTemplate(template.config);
                            setTemplateMenuOpen(false);
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
            <p className="text-s font-semibold text-muted-foreground uppercase tracking-wider">
              Budget Inputs:
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
            id="one-time-expenses"
            title="One-Time Expenses"
            icon={<Calendar className="w-4 h-4 text-red-500" />}
            openSections={openSections}
            onToggle={toggle}
          >
            <OneTimeExpenseForm />
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
          </div>
        </aside>

        {/* Dashboard */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toggle sidebar on desktop */}
          <div className="hidden lg:block">
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
          </div>

          <SummaryCards />

          <MemoizedCharts />
        </main>
      </div>
    </div>
  );
}
