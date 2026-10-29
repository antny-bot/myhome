# 단지 식별자 체계 개선 및 정규화 설계서 (Task B-6)

- **문서 번호**: 13a
- **작성 일자**: 2026-10-30
- **상태**: 사용자 검토 및 승인 대기 (Draft for Approval)
- **대상 모듈**: `packages/shared`, `packages/collector`, `packages/dashboard`

---

## 1. 배경 및 문제점 분석

### 1.1 현행 식별자 구조
현재 myhome 시스템은 아파트 단지의 고유 식별자로 `${lawdCode}|${complexName}` 형식을 사용하고 있습니다.
- 예: `11680|대치은마`, `11680|개포자이프레지던스`

### 1.2 주요 한계점
1. **단지명 표기 파편화로 인한 단지 중복 생성**:
   - 국토부 실거래가 입력 주체(지자체, 중개사)에 따라 띄어쓰기 및 차수 표기가 달라 별개의 단지로 생성됨:
     - 예: `래미안 블레스티지` vs `래미안블레스티지`
     - 예: `반포자이(1차)` vs `반포자이 1차` vs `반포자이1차`
   - 이로 인해 시계열 실거래 추이(`trend`)와 통계 그래프가 둘로 쪼개지는 현상 발생.
2. **동일 법정동 내 동명이의 단지 충돌**:
   - 동일 시군구(5자리 법정동) 내에 같은 이름의 소규모 나홀로 아파트나 빌라/주상복합이 존재하는 경우 동일 단지로 병합되어 통계 왜곡 발생.
3. **외부 공공 데이터(건축HUB, K-apt) 매핑 단절**:
   - 표준 단지코드(`kaptNo`)가 없어 세대수, 주차대수, 사용승인일 등 건축물대장 메타데이터를 매핑할 때 주소 기반 지오코딩 및 이름 유사도에 의존해야 함.

---

## 2. 개선 목표 및 핵심 설계 원칙

1. **표준 단지코드(`kapt_no`) 우선 연동**:
   - 국토부 API 응답 및 K-apt 공동주택 표준 식별코드(`kapt_no`)를 1차 키로 활용.
2. **미등록/표준코드 부재 단지를 위한 주소 기반 정규화 식별자(Deterministic ID)**:
   - `kapt_no`가 없는 단지는 `lawdCode + 법정동(dong) + 지번(bun-ji) + 정규화단지명`을 조합하여 충돌 없는 고유 키 생성.
3. **단지명 정규화 파이프라인(Normalization Engine)**:
   - 띄어쓰기 압축, 괄호 내 부가정보 분리, 로마자/숫자 차수 표기 통일.
4. **무중단 점진 마이그레이션 및 하위 호환성**:
   - 기존 `${lawdCode}|${name}`는 `legacy_id`로 보존하고, URL 파라미터 및 API는 구버전 식별자를 투명하게 조회 가능하도록 Alias 지원.

---

## 3. 세부 설계안

### 3.1 단지명 정규화 규칙 (Normalization Pipeline)
단지명 문자열 처리 순서:
```
[원문] "래미안 반포 퍼스티지 (1차)"
  ↓ 1. 소문자화 및 유니코드 정규화 (NFKC)
[정규화 1] "래미안 반포 퍼스티지 (1차)"
  ↓ 2. 법인/단위 불필요 수식어 제거 ("(주)", "(주식회사)", "아파트" 등)
[정규화 2] "래미안 반포 퍼스티지 (1차)"
  ↓ 3. 차수 및 블록 표기 통일 (예: "I차" -> "1차", "(1단지)" -> "1단지")
[정규화 3] "래미안 반포 퍼스티지 1차"
  ↓ 4. 공백 압축 및 제거 (검색용 토큰과 표시용 이름 분리)
[Canonical Name] "래미안반포퍼스티지1차"
```

### 3.2 고유 식별자(ID) 생성 알고리즘
```ts
function generateComplexId(params: {
  kaptNo?: string | null;
  lawdCode: string;
  dongName?: string | null;
  jibun?: string | null;
  normalizedName: string;
}): string {
  // 1. 공공 표준 단지코드가 존재하는 경우
  if (params.kaptNo && params.kaptNo.trim()) {
    return `KAPT_${params.kaptNo.trim()}`;
  }

  // 2. 지번 정보가 확보된 경우 (지번 결합 고유키)
  if (params.dongName && params.jibun) {
    const cleanJibun = params.jibun.trim().replace(/\s+/g, "");
    return `ADDR_${params.lawdCode}_${params.dongName.trim()}_${cleanJibun}_${params.normalizedName}`;
  }

  // 3. 지번 미확보 시 (법정동코드 + 정규화단지명)
  return `LEMD_${params.lawdCode}_${params.normalizedName}`;
}
```

---

## 4. 데이터베이스 스키마 마이그레이션 계획

### 4.1 테이블 구조 변경 (`complexes`)
```sql
ALTER TABLE complexes ADD COLUMN kapt_no TEXT;
ALTER TABLE complexes ADD COLUMN canonical_name TEXT;
ALTER TABLE complexes ADD COLUMN legacy_id TEXT;

-- 빠른 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_complexes_kapt_no ON complexes(kapt_no);
CREATE INDEX IF NOT EXISTS idx_complexes_canonical_name ON complexes(canonical_name);
CREATE INDEX IF NOT EXISTS idx_complexes_legacy_id ON complexes(legacy_id);
```

### 4.2 참조 무결성 및 외래키 업데이트 매트릭스

| 대상 테이블 | 외래키 / 식별자 컬럼 | 영향도 | 마이그레이션 방안 |
|---|---|---|---|
| `complexes` | `id` (PK) | 높음 | 신규 `id` 생성 및 기존 id는 `legacy_id`로 보존 |
| `transactions` | `complex_id` (FK) | 높음 | `UPDATE transactions SET complex_id = new_id` 일괄 매핑 |
| `complex_area_mappings` | `complex_id` (FK) | 중간 | `UPDATE complex_area_mappings SET complex_id = new_id` 일괄 매핑 |
| `graph_presets_analysis` | `building_name`, `region_name` | 낮음 | 이름 기반 조회이므로 영향 최소 |
| `complexes_fts` | `complex_id` | 중간 | 신규 ID 기반 가상 테이블 리빌드 (`REBUILD`) |

---

## 5. API 및 프론트엔드 호환성 유지 전략

1. **단지 상세 API (`/api/graph/complex/:idOrName/detail`)**:
   - 파라미터가 `KAPT_`, `ADDR_`, `LEMD_` 접두사를 가지면 신규 ID로 직접 조회.
   - 단지명이거나 구버전 `${lawdCode}|${name}` 형태인 경우 `legacy_id` 및 `name` 복합 조회로 100% 호환성 보장.
2. **프론트엔드 URL 체계**:
   - 북마크 및 기존 공유 URL(`?complex=대치은마&lawdCode=11680`)이 깨지지 않도록 Query Resolver 미들웨어에서 신규 ID 자동 바인딩.

---

## 6. 결론 및 향후 계획

본 설계서는 Phase B에서 수립되었으며, 실거래 데이터와 외래키 전체에 미치는 파급력을 감안하여 **사용자 승인 후 별도의 전용 마이그레이션 Task(Phase C/D 연계)**로 구현을 진행합니다.
