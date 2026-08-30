import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { AppShell } from "../shared/layout/AppShell";
import { LocalAccessGuard } from "../shared/ui/LocalAccessGuard";
import { LoadingState } from "../shared/ui/PageState";
import type { TimezoneMode } from "../shared/model/types";

const OverviewPage = lazy(() => import("../features/overview/OverviewPage").then((module) => ({ default: module.OverviewPage })));
const DetectionsPage = lazy(() => import("../features/detections/DetectionsPage").then((module) => ({ default: module.DetectionsPage })));
const RunsPage = lazy(() => import("../features/runs/RunsPage").then((module) => ({ default: module.RunsPage })));
const RunDetailPage = lazy(() => import("../features/runs/RunDetailPage").then((module) => ({ default: module.RunDetailPage })));
const InvestigationsPage = lazy(() => import("../features/investigations/InvestigationsPage").then((module) => ({ default: module.InvestigationsPage })));
const OperationsPage = lazy(() => import("../features/operations/OperationsPage").then((module) => ({ default: module.OperationsPage })));
const SystemArchitecturePage = lazy(() => import("../features/system/SystemArchitecturePage").then((module) => ({ default: module.SystemArchitecturePage })));

export default function App() {
  const [timezone, setTimezone] = useState<TimezoneMode>("KST");

  return (
    <LocalAccessGuard>
      <AppShell timezone={timezone} onTimezoneChange={setTimezone}>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage timezone={timezone} />} />
            <Route path="/detections" element={<DetectionsPage timezone={timezone} />} />
            <Route path="/runs" element={<RunsPage timezone={timezone} />} />
            <Route path="/runs/:runId" element={<RunDetailPage timezone={timezone} />} />
            <Route path="/investigations" element={<InvestigationsPage timezone={timezone} />} />
            <Route path="/operations" element={<OperationsPage timezone={timezone} />} />
            <Route path="/system" element={<SystemArchitecturePage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </LocalAccessGuard>
  );
}
