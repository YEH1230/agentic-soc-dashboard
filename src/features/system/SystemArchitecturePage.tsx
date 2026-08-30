import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  KeyRound,
  Laptop,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
} from "lucide-react";
import { runtimeConfig } from "../../shared/config/runtime";

const apiDisplay = runtimeConfig.apiBase.startsWith("/")
  ? `${runtimeConfig.dashboardOrigin}${runtimeConfig.apiBase}`
  : runtimeConfig.apiBase;

const boundaries = [
  {
    icon: Cloud,
    title: "외부 로그 서버",
    zone: "외부 네트워크",
    detail: "쇼핑몰·서비스 서버의 로그를 읽기 전용으로 조회",
    access: "로컬 Agent가 밖으로 요청",
  },
  {
    icon: HardDrive,
    title: "Agentic SOC",
    zone: "사용자 로컬 PC",
    detail: "10분 주기로 로그를 분석하고 결과를 저장",
    access: "외부의 인바운드 접속 없음",
  },
  {
    icon: Database,
    title: "PostgreSQL",
    zone: "로컬 내부 저장소",
    detail: "판정·실행·조사 기록을 보관",
    access: "백엔드만 접근, 브라우저 직접 접근 금지",
  },
  {
    icon: Server,
    title: "Result API",
    zone: "로컬 백엔드",
    detail: "저장된 분석 결과를 대시보드에 전달",
    access: runtimeConfig.apiIsLoopback ? "로컬 주소 확인됨" : "외부 주소 차단 대상",
  },
  {
    icon: Laptop,
    title: "Dashboard",
    zone: "로컬 브라우저",
    detail: "사용자가 탐지 결과와 에이전트 상태를 확인",
    access: "127.0.0.1 / localhost만 허용",
  },
];

export function SystemArchitecturePage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">LOCAL DEPLOYMENT</span>
          <h2>외부 로그는 가져오고, 관리 화면은 이 PC 안에 둡니다</h2>
          <p>계정 로그인 대신 운영체제의 로컬 사용자 경계를 사용하며, 외부 서버가 로컬 PC로 접속하는 통로는 만들지 않습니다.</p>
        </div>
        <div className="page-heading__stat page-heading__stat--success">
          <LockKeyhole size={18} />
          <span>접근 모드</span>
          <strong>로컬 전용</strong>
        </div>
      </section>

      <section className="local-safety-banner" aria-label="로컬 접근 상태">
        <div className="local-safety-banner__icon"><ShieldCheck size={22} /></div>
        <div>
          <strong>로그인 없는 단일 사용자 모드</strong>
          <p>대시보드가 로컬 주소에서만 열리므로 별도의 계정 정보를 저장하지 않습니다.</p>
        </div>
        <div className="local-safety-banner__meta">
          <span><CheckCircle2 size={13} /> 로컬 UI</span>
          <code>{runtimeConfig.dashboardOrigin}</code>
        </div>
      </section>

      <section className="panel architecture-panel">
        <div className="panel__header">
          <div><span className="eyebrow">DATA FLOW</span><h2>로그에서 화면까지의 흐름</h2></div>
          <Network size={18} />
        </div>
        <div className="architecture-flow">
          {boundaries.map((item, index) => {
            const Icon = item.icon;
            return (
              <div className="architecture-flow__group" key={item.title}>
                <article className="architecture-node">
                  <div className="architecture-node__icon"><Icon size={19} /></div>
                  <span>{item.zone}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.access}</small>
                </article>
                {index < boundaries.length - 1 ? <ArrowRight className="architecture-arrow" size={18} aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>
        <div className="pull-direction-note">
          <ArrowRight size={16} />
          <div><strong>Pull 방향</strong><span>로컬 Agentic SOC가 외부 서버로 요청합니다. 외부 서버가 로컬 PC로 들어오는 포트는 열지 않습니다.</span></div>
        </div>
      </section>

      <section className="security-grid">
        <article className="panel boundary-card">
          <div className="panel__header"><div><span className="eyebrow">NETWORK BOUNDARY</span><h2>현재 프론트엔드 경계</h2></div><LockKeyhole size={18} /></div>
          <dl className="runtime-list">
            <div><dt>대시보드</dt><dd><code>{runtimeConfig.dashboardOrigin}</code><span className="runtime-ok">로컬 확인</span></dd></div>
            <div><dt>Result API</dt><dd><code>{apiDisplay}</code><span className={runtimeConfig.apiIsLoopback ? "runtime-ok" : "runtime-danger"}>{runtimeConfig.apiIsLoopback ? "로컬 확인" : "외부 주소"}</span></dd></div>
            <div><dt>PostgreSQL</dt><dd><code>브라우저에 주소 비공개</code><span className="runtime-ok">직접 접근 없음</span></dd></div>
            <div><dt>데이터</dt><dd><code>{runtimeConfig.dataMode === "mock" ? "sample" : "live"}</code><span>{runtimeConfig.dataMode === "mock" ? "샘플 모드" : "실시간 모드"}</span></dd></div>
          </dl>
        </article>

        <article className="panel rules-card">
          <div className="panel__header"><div><span className="eyebrow">ACCESS RULES</span><h2>프로그램이 지키는 원칙</h2></div><KeyRound size={18} /></div>
          <ul className="security-rule-list">
            <li><CheckCircle2 size={16} /><div><strong>외부 주소에서 UI 차단</strong><span>localhost와 127.0.0.1이 아니면 대시보드를 표시하지 않습니다.</span></div></li>
            <li><CheckCircle2 size={16} /><div><strong>외부 Result API 차단</strong><span>실시간 모드에서 로컬이 아닌 API 주소는 요청하지 않습니다.</span></div></li>
            <li><CheckCircle2 size={16} /><div><strong>인증 정보 전송 안 함</strong><span>대시보드의 API 요청에 브라우저 쿠키를 포함하지 않습니다.</span></div></li>
            <li><CheckCircle2 size={16} /><div><strong>로그 서버는 읽기 전용</strong><span>Agent는 분석에 필요한 로그만 가져오고 서버 변경 권한을 갖지 않습니다.</span></div></li>
          </ul>
        </article>
      </section>
    </div>
  );
}
