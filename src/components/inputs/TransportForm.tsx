import { useState } from 'react';
import { useBudgetStore } from '@/store/budgetStore';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { formatCurrency } from '@/lib/utils';
import { WEEKDAYS_PER_MONTH, WEEKEND_DAYS_PER_MONTH, WEEKS_PER_MONTH } from '@/lib/constants';
import { ChevronDown, Car, TrainFront } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';

export function TransportForm() {
  const { transportConfig, updateTransportConfig } = useBudgetStore();
  const [autoOpen, setAutoOpen] = useState(transportConfig.autoEnabled);
  const [publicOpen, setPublicOpen] = useState(transportConfig.publicEnabled);

  // Estimate monthly auto cost
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
  const monthlyAuto =
    weekdayFuelCost * WEEKDAYS_PER_MONTH + weekendFuelCost * WEEKEND_DAYS_PER_MONTH;

  const monthlyPublic = transportConfig.publicWeeklyCost * WEEKS_PER_MONTH;

  const monthlyTotal =
    (transportConfig.autoEnabled ? monthlyAuto : 0) +
    (transportConfig.publicEnabled ? monthlyPublic : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-sm font-semibold">Commuting Expenses</h3>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={transportConfig.enabled}
            onChange={(e) =>
              updateTransportConfig({ enabled: e.target.checked })
            }
            className="rounded border-input cursor-pointer"
          />
          Enabled
        </label>
      </div>

      {!transportConfig.enabled && (
        <p className="text-sm text-muted-foreground italic">
          Commuting cost tracking is disabled.
        </p>
      )}

      {/* Always show content, but grey out when disabled */}
      <div className={!transportConfig.enabled ? 'opacity-50 pointer-events-none' : ''}>
        {/* Auto Transit */}
        <div className="rounded-lg border border-input overflow-hidden pt-1">
          <button
            onClick={() => setAutoOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-accent hover:shadow-sm transition-all cursor-pointer"
          >
            <Car className="w-4 h-4 text-blue-500" />
            <span className="flex-1 text-left">Auto Transit</span>
            <label
              className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={transportConfig.autoEnabled}
                onChange={(e) => {
                  updateTransportConfig({ autoEnabled: e.target.checked });
                  if (e.target.checked) setAutoOpen(true);
                }}
                className="rounded border-input cursor-pointer"
              />
            </label>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${autoOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {autoOpen && (
            <div className={`px-3 pb-3 space-y-3 border-t ${!transportConfig.autoEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      Weekday miles/day
                      <Tooltip content="Miles driven per weekday (Mon-Fri)" />
                    </label>
                    <DebouncedNumberInput
                      value={transportConfig.autoWeekdayMiles}
                      onChange={(val) =>
                        updateTransportConfig({ autoWeekdayMiles: val })
                      }
                      min={0}
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      Weekend miles/day
                      <Tooltip content="Miles driven per weekend day (Sat-Sun)" />
                    </label>
                    <DebouncedNumberInput
                      value={transportConfig.autoWeekendMiles}
                      onChange={(val) =>
                        updateTransportConfig({ autoWeekendMiles: val })
                      }
                      min={0}
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      Vehicle MPG
                      <Tooltip content="Your vehicle's fuel efficiency (miles per gallon)" />
                    </label>
                    <DebouncedNumberInput
                      value={transportConfig.autoMpg}
                      onChange={(val) =>
                        updateTransportConfig({ autoMpg: val })
                      }
                      min={1}
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      Fuel cost ($/gal)
                      <Tooltip content="Current price per gallon of fuel" />
                    </label>
                    <DebouncedNumberInput
                      value={transportConfig.autoFuelCostPerGallon}
                      onChange={(val) =>
                        updateTransportConfig({ autoFuelCostPerGallon: val })
                      }
                      min={0}
                      step="0.10"
                    />
                  </div>
                </div>
                {transportConfig.autoEnabled && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatCurrency(weekdayFuelCost)}/weekday ·{' '}
                    {formatCurrency(weekendFuelCost)}/weekend day ·{' '}
                    {formatCurrency(Math.round(monthlyAuto))}/month
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Public Transit */}
          <div className="rounded-lg border border-input overflow-hidden">
            <button
              onClick={() => setPublicOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-accent hover:shadow-sm transition-all cursor-pointer"
            >
              <TrainFront className="w-4 h-4 text-purple-500" />
              <span className="flex-1 text-left">Public Transit</span>
              <label
                className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={transportConfig.publicEnabled}
                  onChange={(e) => {
                    updateTransportConfig({ publicEnabled: e.target.checked });
                    if (e.target.checked) setPublicOpen(true);
                  }}
                  className="rounded border-input cursor-pointer"
                />
              </label>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${publicOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {publicOpen && (
              <div className={`px-3 pb-3 space-y-3 border-t ${!transportConfig.publicEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">
                    Average weekly cost ($)
                  </label>
                  <DebouncedNumberInput
                    value={transportConfig.publicWeeklyCost}
                    onChange={(val) =>
                      updateTransportConfig({ publicWeeklyCost: val })
                    }
                    min={0}
                    step="1"
                  />
                </div>
                {transportConfig.publicEnabled && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatCurrency(Math.round(monthlyPublic))}/month
                  </p>
                )}
              </div>
            )}
          </div>

        {/* Summary */}
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Estimated monthly commuting cost
          </p>
          <p className="text-sm font-bold mt-0.5">
            ≈ {formatCurrency(Math.round(monthlyTotal))}
          </p>
        </div>
      </div>
    </div>
  );
}
