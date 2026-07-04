# 개발 완료 보고서 (walkthrough.md)

Neo4j 그래프 데이터베이스의 실거래가 데이터를 다차원적이고 입체적으로 탐색할 수 있는 **분석 대시보드(5탭 리포트)** 및 **Oracle VM용 독립형 데이터 수집기(Collector)** 구현을 성공적으로 완료하였습니다.

---

## 1. 아키텍처 및 패키지 구조 변경 (모노레포)

기존 단일 패키지 구조에서 **npm workspaces 기반의 모노레포 구조**로 마이그레이션하여 모듈 결합도를 낮추고 각 기기별(Oracle VM, Synology) 배포 효율을 극대화했습니다.

```
myhome/ (monorepo)
├── packages/
│   ├── shared/         ← Neo4j 클라이언트(@myhome/shared), 공통 타입, 유틸리티
│   ├── collector/      ← Oracle VM 배포용 경량 1회성 데이터 수집기 봇
│   └── dashboard/      ← Synology NAS 배포용 Express 서버 + React 프론트엔드
```

---

## 2. 신규 구현 기능 상세

### 📊 Neo4j 그래프 분석 대시보드 (5개 탭 리포트)
대시보드 사이드바에 **"그래프 분석"** 메뉴가 마운트되었으며, 조건 필터 및 조건 프리셋 관리 기능과 5개의 분석 탭이 구현되었습니다.

1. **필터 패널 & 프리셋 저장**:
   - 기간, 지역, 아파트 단지명 키워드, 면적(㎡ / 평 단위 토글 가능) 조건을 설정하여 다중 조건 실거래 검색.
   - 현재 설정한 필터 조건을 이름 붙여 서버 JSON 저장소(`data/graph-presets.json`)에 저장 및 로드, 삭제 가능.

2. **탭 1: 종합 현황 (Overview)**:
   - 주요 통계 KPI 카드 (총 거래량, 평균가, 최고가, 최저가).
   - `recharts` 시계열 차트: 월별 평균 실거래가 추이(Line) 및 거래량 변화(Bar)의 상관관계를 시각화.
   - 지역별 평균 가격 비교(Bar) 및 거래량 상위 10개 아파트 단지(Horizontal Bar) 통계 제공.

3. **탭 2: 단지별 분석 (Complex Analysis)**:
   - 특정 아파트 단지를 전용으로 정밀 분석.
   - 월별 평균 시계열 변동 추이 차트.
   - 단지 내의 평수별 평균 거래가 분석(Bar) 및 층별 거래 건수 분포(Bar).
   - 최근 10건 실거래 내역 테이블 제공.

4. **탭 3: 계층 드릴다운 (Drilldown)**:
   - **`전체 > 시/도 > 아파트 단지 > 평수`** 단계로 차례차례 깊숙이 들어가는 Breadcrumb 탐색 구조.
   - 각 계층 단계마다 하위 요소(평균 가격, 거래량)를 카드 그리드 형태로 제공하며, 우측에 현재 계층의 시계열 추이 면적 차트(Area) 제공.

5. **탭 4: 그래프 네트워크 (Graph View)**:
   - D3-force 물리 레이아웃 기반인 `react-force-graph-2d`를 사용한 Node-Link 다이어그램.
   - **Region(파랑) ──▶ Complex(초록) ──▶ Transaction(주황, 가격 비례)** 계층 관계를 시차적으로 파악 가능.
   - 줌/팬 제공 및 노드 클릭 시 우측 정보 설명 패널에 상세 정보 바인딩.

6. **탭 5: AI 인사이트 (LLM Prompt Builder)**:
   - 필터링된 실거래 데이터 통계를 기반으로 마크다운 요약 데이터를 자동 조립.
   - 3가지 부동산 전문 템플릿(가격 추세, 투자 가치 평가, 이상 거래 탐지) 제공.
   - 원클릭 복사하여 외부 LLM(Gemini, Claude 등)에 입력하고, AI 분석 응답 결과를 붙여넣어 서버(`data/insights.json`)에 이력 보고서로 보존/조회 가능.

---

## 3. Oracle VM용 수집 봇 (Collector)

Oracle Free Tier VM의 자원과 네트워크 환경을 위해 대시보드 서버를 통하지 않고 **직접 로컬 MCP 서버(AptInfo)를 서브 프로세스로 구동**하여 데이터를 긁어와 Neo4j 클라우드로 쏘아 올리는 초경량 봇 패키지 `@myhome/collector`를 완성했습니다.

- **설정 동기화**: 수집 조건(지역) 목록은 Synology 대시보드 서버 API(`DASHBOARD_URL/api/rules`)를 긁어서 가져오므로, 사용자는 여전히 웹 대시보드 프론트엔드에서 수집 대상을 제어할 수 있습니다.
- **수집 대상 확장**: `packages/collector/config/targets.json` 에 수동 수집 지역코드를 추가하여 대시보드 규칙 조건 외의 지역도 병행 수집할 수 있습니다.
- **冪等性(멱등성)**: Neo4j의 `MERGE` 구문을 활용해 중복된 거래는 가격 정보 등만 갱신하며 안전하게 무한 누적됩니다.

---

## 4. 설치 및 실행 가이드

### 1) 빌드 및 로컬 테스트
루트 디렉토리에서 전체 패키지를 빌드합니다:
```bash
# 의존성 설치 및 모노레포 링크
npm install

# shared -> collector -> dashboard 순으로 전체 컴파일 및 빌드
npm run build
```

대시보드 개발 서버 구동:
```bash
npm run dev
```

### 2) Oracle VM 배포 및 크론 설정
Oracle VM에 `packages/collector/` 및 `packages/shared/` 패키지와 `.env` 접속 정보를 업로드한 후, 매일 오전 6시에 실행되도록 크론에 등록합니다.

```bash
# VM crontab 편집
crontab -e
```

아래 설정을 추가합니다:
```bash
# 매일 오전 6시 실행 및 로그 적재
0 6 * * * cd /home/ubuntu/myhome && node packages/collector/dist/index.js >> /var/log/myhome-collector.log 2>&1
```

---

## 5. 검증 결과
- TypeScript 컴파일러 타입 체크 100% 통과 (Shared, Dashboard, Collector).
- Vite 프로덕션 빌드 완료 (dist/ 정적 애셋 빌드 완료).
- `GRAPH_DB_ENABLED=true` 환경 변수 기동 준비 완료.
