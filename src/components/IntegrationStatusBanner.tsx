import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Database, ShieldAlert } from 'lucide-react';

interface IntegrationBannerProps {
  moduleName: string;
  endpointPath: string;
  isBackendConfigured: boolean;
  sandboxActive: boolean;
  externalDependency?: string;
}

/**
 * Explicitly communicates the boundary between:
 * 1. Implemented UI & client-side validation
 * 2. Pending backend/provider integrations
 * 3. Isolated development test fixtures (when activated by the developer/owner for UI testing)
 */
export const IntegrationBanner: React.FC<IntegrationBannerProps> = ({
  moduleName,
  endpointPath,
  isBackendConfigured,
  sandboxActive,
  externalDependency,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-[#3B0764]">{moduleName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-500">{endpointPath}</span>
            {externalDependency && (
              <>
                <span aria-hidden="true">·</span>
                <span>Requires: {externalDependency}</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isBackendConfigured
              ? 'Backend URL configured. All mutations require a verified server session and idempotency validation.'
              : 'Live backend integration is pending (VITE_API_BASE_URL not connected). Zero fabricated metrics are shown as live results.'}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs font-medium">
          {isBackendConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>API Target Configured</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Integration Pending</span>
            </span>
          )}

          {sandboxActive && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                |
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#FF6B00] font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>TEST FIXTURE SANDBOX (NOT LIVE DATA)</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface EmptyOrUnavailableStateProps {
  state: 'INTEGRATION_PENDING' | 'DATA_UNAVAILABLE' | 'EMPTY_RECORDS';
  title: string;
  description: string;
  endpoint?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyOrUnavailableState: React.FC<EmptyOrUnavailableStateProps> = ({
  state,
  title,
  description,
  endpoint,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center my-4">
      <div className="w-11 h-11 rounded-lg bg-slate-100 text-[#3B0764] flex items-center justify-center mx-auto mb-3">
        {state === 'INTEGRATION_PENDING' && <Clock className="w-5 h-5 text-[#FF6B00]" />}
        {state === 'DATA_UNAVAILABLE' && <ShieldAlert className="w-5 h-5 text-red-600" />}
        {state === 'EMPTY_RECORDS' && <Database className="w-5 h-5 text-[#3B0764]" />}
      </div>

      <div className="text-xs font-medium text-slate-500 mb-1">
        {state === 'INTEGRATION_PENDING' && 'Integration Pending · Backend Not Connected'}
        {state === 'DATA_UNAVAILABLE' && 'Data Unavailable · Backend Request Failed'}
        {state === 'EMPTY_RECORDS' && 'No Verified Records Found'}
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 max-w-xl mx-auto mb-4">{description}</p>

      {endpoint && (
        <div className="text-xs font-mono text-slate-500 mb-5">
          Proposed Contract: {endpoint}
        </div>
      )}

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
