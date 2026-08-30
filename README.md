# Agentic SOC Local Dashboard

외부 서버의 로그를 로컬 Agentic SOC가 읽기 전용으로 가져와 분석하고, 그 결과를 사용자 PC에서만 확인하는 프론트엔드입니다. 단일 사용자 로컬 설치를 전제로 하므로 계정·로그인 UI를 두지 않습니다.

## 로컬 실행

```powershell
pnpm install
pnpm dev
```

`pnpm dev`는 결과 폴더 감시 서비스와 Vite UI를 함께 시작합니다.

- 대시보드: `http://127.0.0.1:4173`
- 로컬 Result API: `http://127.0.0.1:8000/api/v1`
- 기본 결과 폴더: 프로젝트의 `output/`

두 서버 모두 로컬 PC에서만 접근할 수 있도록 `127.0.0.1`에 바인딩됩니다. `0.0.0.0`으로 변경하지 마십시오.

## 탐지 결과 실시간 반영

에이전트는 완성된 탐지 결과를 다음 순서로 기록합니다.

1. `output/DET-....json.tmp`에 JSON 전체를 씁니다.
2. 쓰기가 끝난 뒤 같은 폴더에서 `.json`으로 원자적으로 이름을 바꿉니다.
3. 결과 서비스가 새 `.json`을 검증·색인하고 SSE 이벤트를 보냅니다.
4. 열린 대시보드는 API 캐시를 즉시 새로 읽어 모든 화면을 갱신합니다.

`.json.tmp`는 대시보드에 절대 노출하지 않습니다. 잘못된 JSON 하나는 다른 정상 결과를 중단시키지 않으며, 오류 내용은 `/operations` 화면에 표시됩니다. SSE 연결이 잠시 끊겨도 10초 간격 조회가 보조 수단으로 동작합니다.

결과 폴더를 바꾸려면 실행 전에 환경 변수를 설정합니다.

```powershell
$env:AGENTIC_SOC_OUTPUT_DIR = "D:\AgenticSOC\results"
pnpm dev
```

실시간 연결 검증은 서비스가 실행 중일 때 수행합니다.

```powershell
pnpm test:live
```

이 테스트는 임시 결과를 만들어 `.json.tmp` 제외, 완성 파일 자동 등록, 최신 결과 변경, SSE 수신을 확인한 뒤 테스트 파일을 제거합니다.

## 최종 프로그램 빌드

```powershell
pnpm build
pnpm start
```

`pnpm start`는 빌드된 `dist`와 Result API를 `http://127.0.0.1:8000`에서 같은 출처로 제공합니다. 최종 사용자는 Vite 개발 서버를 실행하지 않고 이 주소만 엽니다.

```text
외부 로그 서버
  └─ 읽기 전용 Pull
      └─ 로컬 Agentic SOC
          ├─ PostgreSQL: 백엔드 내부에서만 접근
          ├─ Result API: 127.0.0.1 또는 같은 출처 /api
          └─ Dashboard: 127.0.0.1 또는 localhost
```

## 데이터 연결

`.env.example`을 `.env.local`로 복사한 뒤 설정합니다.

```text
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=/api/v1
```

개발 중 Result API가 `127.0.0.1:8000`에서 실행되는 경우 Vite가 `/api` 요청을 로컬 API로 전달합니다. 실시간 모드에서 외부 호스트를 가리키는 API 주소는 프론트엔드가 요청 전에 차단합니다.

기본 API 경로:

- `GET /api/v1/outputs/latest`
- `GET /api/v1/outputs/:runId`
- `GET /api/v1/runs`
- `GET /api/v1/assessments`
- `GET /api/v1/investigations`
- `GET /api/v1/status`
- `GET /api/v1/events` (SSE)

결과 서비스는 파일을 `server/result-schema.mjs`로 먼저 검증하고, 프론트엔드는 API 응답을 다시 Zod 스키마로 검증합니다.

고정 샘플 데이터는 UI 개발 전용입니다. `.env.local`에서 아래처럼 명시한 경우에만 사용되며 기본값은 실시간 API입니다.

```text
VITE_USE_MOCK_DATA=true
```

## 화면

- `/overview`: 최근 실행과 위협 현황
- `/detections`: IP별 판정 검색·필터·상세 근거
- `/runs`: 10분 단위 에이전트 실행 목록
- `/runs/:runId`: 실행 요약, IP 판정, agent trace, 원본 JSON
- `/investigations`: 조사 요청과 체크리스트
- `/operations`: 부분 실패, 구성 요소 상태, 토큰 및 데이터 무결성
- `/system`: 외부 로그 수집 방향, 로컬 구성요소와 접근 경계

## 소스 구조

```text
server/                   로컬 결과 폴더 감시, JSON 검증, API, SSE
output/                   에이전트 탐지 결과 수신 폴더(버전 관리 제외)
src/
├─ app/                  앱 진입점, Provider, 전역 스타일
├─ features/             화면 기능 단위
│  ├─ overview/
│  ├─ detections/
│  ├─ runs/
│  ├─ investigations/
│  ├─ operations/
│  └─ system/            로컬 연결 구조와 보안 경계
├─ mocks/                명시적으로 켤 때만 쓰는 UI 개발 샘플
└─ shared/
   ├─ api/               Result API 및 응답 검증
   ├─ config/            로컬 실행 환경 검증
   ├─ layout/            공통 화면 골격
   ├─ lib/               포맷 유틸리티
   ├─ model/             JSON 계약 타입
   └─ ui/                재사용 UI와 접근 가드
```

## 강제되는 안전 규칙

- Dashboard는 `127.0.0.1` 또는 `localhost`가 아니면 화면을 차단합니다.
- 실시간 Result API는 로컬 주소 또는 같은 출처만 허용합니다.
- API 요청에는 브라우저 인증 쿠키를 포함하지 않습니다.
- PostgreSQL 연결 정보는 프론트엔드에 전달하지 않습니다.
- 외부 로그 서버 연결은 로컬 Agent가 시작하는 읽기 전용 Pull 방식을 전제로 합니다.
