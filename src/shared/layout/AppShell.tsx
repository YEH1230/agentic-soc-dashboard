import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  FileClock,
  Gauge,
  HardDrive,
  LockKeyhole,
  Menu,
  Network,
  Radar,
  ShieldCheck,
  Siren,
  X,
} from "lucide-react";
import { dataMode } from "../api/agentOutputApi";
import type { TimezoneMode } from "../model/types";

const navigation = [
  { to: "/overview", label: "상황 개요", icon: Gauge },
  { to: "/detections", label: "탐지", icon: Radar },
  { to: "/runs", label: "에이전트 실행", icon: FileClock },
  { to: "/investigations", label: "조사 대기열", icon: Siren },
  { to: "/operations", label: "운영 상태", icon: Activity },
  { to: "/system", label: "연결 및 보안", icon: Network },
];

const pageTitles: Record<string, string> = {
  "/overview": "상황 개요",
  "/detections": "탐지 분석",
  "/runs": "에이전트 실행",
  "/investigations": "조사 대기열",
  "/operations": "운영 상태",
  "/system": "연결 및 보안",
};

interface Props {
  children: ReactNode;
  timezone: TimezoneMode;
  onTimezoneChange: (value: TimezoneMode) => void;
}

export function AppShell({ children, timezone, onTimezoneChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const basePath = `/${location.pathname.split("/")[1]}`;
  const title = pageTitles[basePath] ?? "실행 상세";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <ShieldCheck size={23} />
          </div>
          <div>
            <strong>Agentic SOC</strong>
            <span>COMMAND CENTER</span>
          </div>
          <button
            className="icon-button sidebar__close"
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="system-mini">
          <div className="system-mini__status">
            <LockKeyhole size={14} />
            <span>로컬 접근 보호됨</span>
          </div>
          <p>127.0.0.1 · 계정 로그인 없음</p>
        </div>

        <nav className="main-nav" aria-label="주요 메뉴">
          <p className="nav-label">MONITORING</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="agent-card">
            <HardDrive size={18} />
            <div>
              <span>데이터 모드</span>
              <strong>{dataMode === "mock" ? "샘플 데이터" : "실시간 Result API"}</strong>
            </div>
          </div>
          <p>외부 로그 · 읽기 전용 Pull</p>
        </div>
      </aside>

      {mobileOpen ? <button className="backdrop" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)} /> : null}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-button mobile-menu" type="button" aria-label="메뉴 열기" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <span className="eyebrow">AGENTIC SOC</span>
              <h1>{title}</h1>
            </div>
          </div>

          <div className="topbar__right">
            <div className="timezone-switch" aria-label="시간대 선택">
              {(["KST", "UTC"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={timezone === mode ? "is-active" : ""}
                  onClick={() => onTimezoneChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
