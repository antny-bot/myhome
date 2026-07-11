# 개발 완료 보고서 (walkthrough.md)

Neo4j 그래프 DB 실거래가 데이터 탐색용 분석 대시보드(5탭 리포트) 및 Oracle VM용 독립형 데이터 수집기(Collector) 구현 완료.

---

## 1. 아키텍처 및 패키지 구조 변경 (모노레포)

기존 단일 패키지에서 npm workspaces 기반 모노레포 구조 마이그레이션. 모듈 결합도 완화 및 기기별(Oracle VM, Synology) 배포 효율 극대화.

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
대시보드 사이드바 "그래프 분석" 메뉴 마운트. 필터, 프리셋 관리 및 5개 분석 탭 구현.

1. **필터 패널 & 프리셋 저장**:
   - 기간, 지역, 단지명 키워드, 면적(㎡ / 평 토글) 조건 다중 실거래 검색.
   - 설정 필터 조건 저장소(`data/graph-presets.json`) 저장, 로드, 삭제 지원.

2. **탭 1: 종합 현황 (Overview)**:
   - 통계 KPI 카드 (총 거래량, 평균가, 최고가, 최저가).
   - `recharts` 시계열 차트: 월별 평균 실거래가 추이(Line), 거래량 변화(Bar) 시각화.
   - 지역별 평균가 비교(Bar), 거래량 상위 10개 단지(Horizontal Bar) 통계.

3. **탭 2: 단지별 분석 (Complex Analysis)**:
   - 특정 단지 전용 정밀 분석.
   - 월별 평균 시계열 변동 추이.
   - 평수별 평균 거래가(Bar), 층별 거래 분포(Bar).
   - 최근 10건 실거래 테이블.

4. **탭 3: 계층 드릴다운 (Drilldown)**:
   - **`전체 > 시/도 > 아파트 단지 > 평수`** Breadcrumb 탐색 구조.
   - 계층별 하위 요소(평균가, 거래량) 카드 그리드 제공. 우측 시계열 추이 면적 차트(Area).

5. **탭 4: 그래프 네트워크 (Graph View)**:
   - D3-force 물리 레이아웃 기반 `react-force-graph-2d` Node-Link 다이어그램.
   - **Region(파랑) ──▶ Complex(초록) ──▶ Transaction(주황, 가격 비례)** 계층 파악 가능.
   - 줌/팬 및 노드 클릭 시 우측 정보 패널 상세 정보 바인딩.

6. **탭 5: AI 인사이트 (LLM Prompt Builder)**:
   - 필터링 실거래 데이터 통계 기반 마크다운 요약 자동 조립.
   - 부동산 템플릿 3종(가격 추세, 투자 가치, 이상 거래) 제공.
   - 외부 LLM(Gemini, Claude 등) 입력용 원클릭 복사. AI 분석 응답 서버(`data/insights.json`) 저장 및 이력 조회.

---

## 3. Oracle VM용 수집 봇 (Collector)

Oracle VM 환경 고려, 직접 로컬 MCP 서버(AptInfo) 서브 프로세스 구동. 데이터 수집 후 Neo4j 클라우드 전송하는 초경량 봇 `@myhome/collector` 구현.

- **설정 동기화**: 수집 조건 목록 Synology 대시보드 API(`DASHBOARD_URL/api/rules`) 연동. 웹 대시보드에서 수집 대상 제어 유지.
- **수집 대상 확장**: `packages/collector/config/targets.json` 내 수동 수집 지역코드 추가 시 규칙 외 지역 병행 수집 지원.
- **冪等性(멱등성)**: Neo4j `MERGE` 구문 활용 중복 거래 가격 갱신 및 무한 누적.

---

## 4. 설치 및 실행 가이드

### 1) 빌드 및 로컬 테스트
루트 디렉토리 빌드:
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
Oracle VM에 `packages/collector/`, `packages/shared/`, `.env` 업로드 후 매일 오전 6시 실행 크론 등록.

```bash
# VM crontab 편집
crontab -e
```

설정 추가:
```bash
# 매일 오전 6시 실행 및 로그 적재
0 6 * * * cd /home/ubuntu/myhome && node packages/collector/dist/index.js >> /var/log/myhome-collector.log 2>&1
```

---

## 5. 검증 결과
- TypeScript 컴파일러 타입 체크 100% 통과 (Shared, Dashboard, Collector).
- Vite 프로덕션 빌드 완료 (dist/ 정적 애셋 빌드 완료).
- `GRAPH_DB_ENABLED=true` 환경 변수 기동 준비 완료.
