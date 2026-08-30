import { LockKeyhole, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { runtimeConfig } from "../config/runtime";

export function LocalAccessGuard({ children }: { children: ReactNode }) {
  if (runtimeConfig.dashboardIsLoopback) return children;

  return (
    <main className="access-blocked" role="alert">
      <div className="access-blocked__icon">
        <ShieldAlert size={30} />
      </div>
      <span className="eyebrow">LOCAL ACCESS REQUIRED</span>
      <h1>외부 네트워크 접근이 차단되었습니다</h1>
      <p>
        이 대시보드는 계정 로그인 대신 로컬 PC 접근 경계를 사용합니다. 현재 주소는 로컬 전용 주소가 아니므로 화면을 표시하지 않습니다.
      </p>
      <div className="access-blocked__address">
        <LockKeyhole size={16} />
        <code>{runtimeConfig.dashboardOrigin}</code>
      </div>
      <small>프로그램이 설치된 PC에서 127.0.0.1 또는 localhost 주소로 다시 접속해 주세요.</small>
    </main>
  );
}
