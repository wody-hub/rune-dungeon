# Rune Dungeon 코드 표준

이 문서는 Rune Dungeon 저장소에서 작성하고 리뷰하는 코드의 기준이다. 언어별 관례,
프로젝트 고유 규칙, 현재 자동 검증 명령을 한곳에 정의한다. 코드의 구조와 변경 품질을
심사하는 절차는 [코드 리뷰 가이드](./review-guide.md)를 따른다.

## 1. 적용 범위와 규칙 강도

다음 파일에 적용한다.

- Rust: `shared/**/*.rs`, `server/**/*.rs`
- TypeScript와 Svelte: `client/src/**/*.ts`, `client/src/**/*.svelte`, 클라이언트 설정
- JavaScript: `**/*.js`, `**/*.mjs`
- HTML과 CSS: `client/index.html`, `client/src/**/*.css`, Svelte의 마크업과 `<style>`
- 데이터와 설정: `**/*.json`, `**/*.toml`
- Markdown: `**/*.md`

규칙의 강도는 다음과 같다.

- **MUST**: 위반하면 병합을 막는다. 정확성, 프로토콜, 권위, 보안, 자동 검사와 직접
  관련된 규칙이다.
- **SHOULD**: 특별한 이유가 없으면 따른다. 벗어날 때는 코드나 리뷰에 이유를 남긴다.
- **MAY**: 상황에 따라 선택할 수 있다.

자동화 상태는 다음 두 용어로 구분한다.

- **Enforced**: 저장소에 명령이나 설정이 존재하고 지금 실행할 수 있다.
- **Proposed**: 채택할 만한 기준이지만 아직 의존성이나 CI가 없다. 문서만으로 이미
  자동 강제된 것처럼 취급하지 않는다.

## 2. 기준의 우선순위

규칙이 충돌하면 아래 순서로 판단한다.

1. 승인된 제품·프로토콜 계약과 테스트 픽스처
2. 루트 `CLAUDE.md`, `DESIGN.md`, `plan/04_Technical_Architecture.md`
3. 이 문서와 [코드 리뷰 가이드](./review-guide.md)
4. 언어·프레임워크 공식 문서
5. 주변 코드의 관례

주변 코드가 이 문서와 다르다는 이유만으로 새 위반을 복제하지 않는다. 기존 동작을
안전하게 유지해야 한다면 예외 사유를 남기고 별도 정리 작업을 제안한다. 포맷 변경과
기능 변경은 가능한 한 같은 커밋에 섞지 않는다.

## 3. 현재 기술 기준선

| 영역 | 현재 기준 | 자동화 상태 |
|---|---|---|
| Rust | edition 2021, `rustfmt`, Clippy, Cargo tests | Enforced |
| TypeScript | TypeScript 6, `strict`, `isolatedModules`, `verbatimModuleSyntax` | Enforced |
| Svelte | Svelte 5, `svelte-check`, typed `$props`와 runes | Enforced |
| JavaScript | Node.js 22.12 이상, ESM, 일부 `checkJs` | 부분 Enforced |
| CSS | 표준 CSS, Svelte scoped styles, `DESIGN.md` 토큰 | 수동 리뷰 |
| JSON | RFC 8259 JSON, 런타임 데이터 검증 스크립트 | 부분 Enforced |
| TOML | TOML 1.0, Cargo 매니페스트 | Cargo가 구문 검증 |
| Markdown | CommonMark 호환 Markdown | 수동 리뷰 |

ESLint, Prettier, Stylelint, markdownlint는 현재 `package.json`에 없다. 해당 도구를
도입하기 전까지는 Proposed이며, 기존 검증 명령을 대체하지 않는다.

## 4. 모든 언어에 공통인 규칙

### 4.1 파일과 변경 범위

- 소스와 문서는 UTF-8과 LF 줄바꿈을 MUST 사용한다.
- 파일 끝에는 줄바꿈 하나를 두고 후행 공백을 MUST 남기지 않는다.
- 한 변경은 하나의 논리적 목적을 가져야 한다. 관련 테스트는 같은 변경에 포함한다.
- 생성물인 `target/`, `client/dist/`, 로컬 캐시와 운영체제 메타데이터를 MUST 커밋하지
  않는다.
- 기존 사용자 변경과 관계없는 파일을 포맷하거나 정리하지 않는다.
- 새 추상화, 디렉터리, 설정은 현재 요구가 있을 때만 만든다. 미래 기능을 위한 빈 계층을
  미리 만들지 않는다.

### 4.2 이름과 상수

- 이름은 역할과 단위를 드러내야 한다. `elapsedMs`, `dtSeconds`, `playerId`처럼 시간,
  좌표, 식별자 단위를 숨기지 않는다.
- 불리언은 가능하면 상태나 질문으로 읽히게 이름 짓는다. 예: `inputEnabled`,
  `canSendJoinedIntent`.
- 프로토콜·데이터 식별자는 승인된 안정 ID를 그대로 사용한다. 표시 이름을 식별자로
  사용하지 않는다.
- 반복되거나 계약을 이루는 숫자와 문자열은 이름 있는 상수로 올린다. 한 번만 쓰이고
  의미가 문맥상 자명한 값까지 기계적으로 상수화하지 않는다.
- 약어는 프로젝트에서 이미 확립된 것만 사용한다. 같은 개념에 여러 이름을 만들지 않는다.

### 4.3 함수와 모듈

- 함수와 모듈은 하나의 설명 가능한 책임을 SHOULD 가진다.
- 공개 함수는 입력, 출력, 상태 변경, 실패 조건이 호출부에서 드러나야 한다.
- 읽기와 상태 변경을 한 함수에 숨겨 섞지 않는다. 변경이 필요하면 이름과 반환 타입으로
  명확히 알린다.
- 중첩 분기보다 guard clause와 판별 가능한 상태 타입을 우선한다.
- 불리언 인자로 서로 다른 동작을 숨기기보다 명시적 함수나 판별 유니온을 고려한다.
- 함수나 파일 길이를 고정 숫자로 합격·불합격 처리하지 않는다. 책임 수, 분기 수, 변경
  이유, 테스트 준비 비용이 커졌는지를 분리 신호로 사용한다.

### 4.4 주석과 문서

- 주석은 코드가 이미 말하는 **무엇**보다 제약, 의도, 트레이드오프인 **왜**를 설명한다.
- 복잡한 수식, 권위 경계, 시간 순서, 브라우저·프로토콜 제약은 짧은 근거 주석을 SHOULD
  가진다.
- 오래된 주석, 주석 처리된 코드, 소유자와 종료 조건이 없는 TODO를 남기지 않는다.
- 공개 계약이나 실행 방법이 바뀌면 같은 변경에서 관련 README, 설계 문서, 픽스처를
  갱신한다.

### 4.5 오류와 경계 검증

- 외부 입력은 신뢰하지 않는다. WebSocket 프레임, JSON, URL, 사용자 입력은 타입과
  값 범위를 경계에서 검증해야 한다.
- 복구 가능한 오류와 프로그래머 불변식 위반을 구분한다. 복구 가능한 오류에 panic,
  non-null assertion, 무조건 cast를 사용하지 않는다.
- 오류를 무시할 때는 정책이 명확해야 한다. 로그, 사용자 표시, 재시도, 연결 종료 중 어떤
  처리를 하는지 코드와 테스트가 보여야 한다.
- 실패 시 권위 경계를 낮추는 폴백을 만들지 않는다. 서버 URL이 있는 경로의 연결 실패는
  로컬 이동이나 로컬 변신으로 전환되지 않는다.

## 5. Rust

Rust 코드는 [Rust Style Guide](https://doc.rust-lang.org/style-guide/)와 기본 `rustfmt`
출력을 따른다. 공개 API는 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
중 현재 크레이트에 적용 가능한 규칙을 사용한다.

### 5.1 포맷과 이름

- `cargo fmt --all`의 기본 출력을 MUST 따른다. 수동 정렬로 `rustfmt`와 싸우지 않는다.
- 들여쓰기는 공백 4칸, 기본 최대 줄 너비는 100자로 둔다.
- 타입과 trait은 `UpperCamelCase`, 함수·변수·모듈은 `snake_case`, 상수는
  `SCREAMING_SNAKE_CASE`를 사용한다.
- 여러 줄 목록에는 후행 쉼표를 사용한다.
- import는 표준 라이브러리, 외부 크레이트, 로컬 모듈 그룹 순으로 읽히게 유지한다.

### 5.2 타입과 API

- 유효하지 않은 상태를 표현하기 어렵게 enum, 새 타입, `Option`, `Result`를 우선한다.
- 공개 범위는 필요한 최소로 둔다. 테스트만 필요한 접근자는 `#[cfg(test)]`를 고려한다.
- 단순 데이터에는 의미에 맞는 `Clone`, `Copy`, `Debug`, `PartialEq`, Serde 파생을
  사용하되 습관적으로 모든 trait을 파생하지 않는다.
- 문자열 소유권이 필요한 상태에는 `String`, 빌리지 않고 참조만 하는 API에는 `&str`을
  우선한다.
- 직렬화 타입을 바꾸면 Rust와 TypeScript가 함께 읽는 골든 픽스처를 MUST 갱신하고
  양쪽 테스트를 실행한다.

### 5.3 오류와 panic

- 프로덕션 경로의 `unwrap()`은 MUST 사용하지 않는다.
- `expect()`는 코드상 증명된 내부 불변식에만 사용하고 실패 이유를 구체적으로 적는다.
- 네트워크, 직렬화, 주소 파싱처럼 정상적으로 실패할 수 있는 작업은 `Result`로 전파하거나
  명시적 프로토콜 정책으로 변환한다.
- 오류 로그에는 실패한 작업과 조치에 필요한 문맥을 포함하되 비밀값이나 전체 사용자
  입력을 기록하지 않는다.

### 5.4 async와 동시성

- `Mutex` guard를 잡은 채 소켓 쓰기나 장시간 `await`를 수행하지 않는다.
- 느린 클라이언트가 서버 상태를 무제한 적체시키지 않도록 outbound 큐는 bounded여야 한다.
- 생성한 task, 세션, 등록 엔트리는 성공·오류·close 모든 종료 경로에서 정리한다.
- tick 루프는 지연 정책을 명시하고 테스트한다. 현재 서버 tick은 200ms이며 missed tick은
  `Skip`이다.
- 공유 상태의 단일 소유자와 변경 지점을 명확히 한다. 클라이언트 의도가 서버 상태를 직접
  대입하게 두지 않는다.

### 5.5 Rust 테스트

- 순수 규칙은 같은 모듈의 단위 테스트로, WebSocket 순서와 정리는 loopback 통합 테스트로
  검증한다.
- 테스트 이름은 조건과 기대 결과를 설명한다.
- 성공 경로뿐 아니라 잘못된 순서, 잘못된 버전, malformed/binary frame, 느린 소비자,
  연결 종료를 포함한다.
- 시간 기반 테스트는 짧은 timeout과 결정적 입력을 사용한다. 고정 포트에 의존하지 않는다.

## 6. TypeScript

TypeScript는 공식 `strict` 모드와 타입 정보를 우선한다. 일반 코드 구성은
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)를 참고하되,
외부 프로젝트에 그대로 적용되지 않는 Google 전용 규칙과 Svelte/Vite가 요구하는 default
export는 프로젝트 예외로 둔다.

### 6.1 포맷과 모듈

- 목표 포맷은 공백 2칸, 작은따옴표, 세미콜론, 여러 줄 목록의 후행 쉼표, 줄 너비 100이다.
  현재 자동 포맷터가 없으므로 수동 리뷰 대상이다.
- `const`를 기본으로 하고 재할당이 필요할 때만 `let`을 사용한다. `var`는 금지한다.
- ESM `import`/`export`를 사용한다. 타입만 쓰는 심벌은 `import type` 또는 인라인
  `type` import로 표시한다.
- 공개 표면은 named export를 우선한다. Svelte 컴포넌트, Vite/Svelte 설정처럼 도구가
  요구하는 default export는 허용한다.
- 같은 논리 프로젝트에서는 상대 import를 사용하되 `../../../`가 반복되면 모듈 경계를
  먼저 점검한다.

### 6.2 타입

- `strict`, `isolatedModules`, `verbatimModuleSyntax`, `noEmit`을 MUST 유지한다.
- `any` 대신 `unknown`을 받고 type guard로 좁힌다. 외부 JSON을 cast만으로 신뢰하지 않는다.
- 상태와 메시지는 판별 유니온을 우선한다. 유효한 variant가 추가되면 switch/분기와 테스트를
  함께 갱신한다.
- Svelte 컴파일 경로에서는 런타임 코드를 생성하는 TypeScript 기능을 사용하지 않는다.
  현재 설정의 `erasableSyntaxOnly`와 맞지 않는 enum, parameter property 등을 피한다.
- non-null assertion(`!`)은 같은 범위에서 존재가 증명될 때만 사용한다. 경계 입력이나
  비동기 생명주기를 덮는 용도로 쓰지 않는다.
- `as unknown as T`와 넓은 cast는 어댑터 경계로 격리하고 검증 또는 테스트 근거를 둔다.
- 숫자에는 단위를 이름으로 표현하고 `NaN`, `Infinity`, 음수 revision/tick처럼 프로토콜이
  허용하지 않는 값을 거부한다.

### 6.3 상태와 부수 효과

- 순수 계산은 입력으로 받고 값을 반환하거나 명시적으로 받은 상태만 변경한다.
- 시간, 난수, 소켓, 스케줄러는 테스트에서 대체할 수 있도록 주입한다.
- 배열·객체의 복사가 소유권 분리를 위한 것인지, 같은 상태를 공유하려는 것인지 명확히 한다.
- 전역 디버그 표면은 개발 빌드에서만 노출한다.
- 프로토콜 parser는 정확한 키, 타입, 유한 숫자, 식별자 범위를 검증하고 알 수 없는 메시지를
  안전하게 거부한다.

### 6.4 TypeScript 테스트

- 관찰 가능한 동작을 테스트한다. 내부 호출 순서에 과도하게 결합하지 않는다.
- 시간·난수·WebSocket은 fake로 통제하고 실제 브라우저 없이 핵심 상태 전이를 검증한다.
- Arrange–Act–Assert가 보이도록 테스트를 구성하고 한 테스트에 독립된 이유를 둔다.
- 프로토콜, 재연결, stale snapshot, socket generation, cleanup처럼 경계 실패를 반드시
  포함한다.

## 7. Svelte

Svelte 컴포넌트는 [Svelte TypeScript 문서](https://svelte.dev/docs/svelte/typescript)와
Svelte 5 runes 모델을 따른다.

### 7.1 컴포넌트 구조

- 컴포넌트 파일명은 `PascalCase.svelte`를 사용한다.
- TypeScript를 쓰는 컴포넌트는 `<script lang="ts">`를 선언하고 `$props()`의 전체 모양을
  타입으로 기술한다.
- props는 입력 계약, callback은 출력 계약으로 사용한다. 부모 상태를 암묵적으로 변경하지
  않는다.
- `$state`는 UI가 반응해야 하는 상태에만 사용한다. 계산 가능한 값은 `$derived`, 외부 자원
  생명주기는 `onMount`와 cleanup으로 관리한다.
- `$effect`를 두 상태를 동기화하는 일반 도구로 남용하지 않는다. 데이터 흐름과 소유자를
  먼저 단순화한다.

### 7.2 게임 루프 경계

- 매 프레임 바뀌는 Three.js 위치·회전·재질은 Svelte 반응성 그래프에 올리지 않는다.
- `GameScene.svelte`가 fixed-step simulation과 render advance를 조정하고, 레이어는 명령형
  `update()`로 표시 상태만 반영한다.
- scene과 UI가 HP, 위치, 인벤토리, 변신 결과를 독자적으로 확정하지 않는다.
- `requestAnimationFrame`, connection, timer, listener는 unmount cleanup을 MUST 가진다.

### 7.3 마크업과 접근성

- 동작에는 `<button>`, 이동에는 `<a>`처럼 의미에 맞는 HTML을 우선한다.
- Svelte compiler의 접근성 warning을 오류처럼 다룬다. `svelte-ignore`는 오탐 근거를 같은
  주석에 남길 때만 허용한다.
- 버튼은 `type`을 명시하고 disabled 상태는 실제 `disabled` 속성으로 표현한다.
- 상태 알림은 중요도에 맞는 `aria-live`를 사용하되 매 프레임 갱신으로 스크린 리더를
  방해하지 않는다.
- 키보드 focus, 색 대비, `prefers-reduced-motion`을 확인한다.
- 신뢰할 수 없는 문자열에 `{@html}`을 사용하지 않는다.

## 8. JavaScript와 Node.js 스크립트

Google의 JavaScript Style Guide는 더 이상 갱신되지 않으며 TypeScript로의 이전을 권장한다.
따라서 새 애플리케이션 로직은 TypeScript를 기본으로 하고, `.mjs`가 필요한 검증·변환 경로에만
ESM, UTF-8, `const` 우선, 명시적 JSDoc 같은 공통 규칙을 적용한다.

- `.js`와 `.mjs`는 ESM을 사용한다. CommonJS가 필요한 외부 제약이 없다면 `require`를
  추가하지 않는다.
- TypeScript가 직접 검사하지 않는 스크립트도 입력 모양을 JSDoc으로 기술한다.
- Node 내장 모듈은 `node:` 접두사를 사용한다.
- 검증 스크립트는 첫 실패에서 원인과 경로를 명확히 알리고 non-zero exit로 끝나야 한다.
- 스크립트는 실행 위치를 명확히 하고 저장소 밖 파일이나 환경 상태를 묵시적으로 변경하지
  않는다.
- 데이터 변환 함수는 입력을 불필요하게 변경하지 않고 결정적 결과를 반환한다.

## 9. HTML과 CSS

### 9.1 HTML

HTML 형식은 [MDN HTML code style](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/HTML)을
참고한다.

- 문서 언어, charset, viewport를 명시한다.
- element와 attribute 이름은 소문자, attribute 값은 큰따옴표를 사용한다.
- 의미 있는 요소와 유효한 중첩을 사용한다.
- inline script와 inline event attribute보다 모듈 진입점과 Svelte handler를 사용한다.
- 장식 이미지는 보조기술에서 숨기고, 의미 있는 이미지는 구체적인 대체 텍스트를 제공한다.

### 9.2 CSS

CSS 세부 시각 결정은 반드시 `DESIGN.md`를 따른다. 일반 코드 형식은
[MDN CSS code style](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/CSS)과
Prettier의 기본 철학을 참고한다.

- 들여쓰기는 공백 2칸, 선택자와 custom property는 소문자 `kebab-case`를 사용한다.
- 전역 스타일은 reset, 루트 레이아웃, 공유 토큰처럼 실제 전역 책임에 제한한다. 컴포넌트
  스타일은 Svelte scoped style에 둔다.
- 색, 간격, 글꼴, 모션은 `visualTheme`과 `--rd-*` 토큰을 우선한다. 새 임의값은 승인된
  디자인 근거가 있을 때만 추가한다.
- 스타일링에는 class selector를 우선한다. ID는 앱 mount나 anchor 같은 고유 의미에
  사용한다.
- `!important`는 금지한다. 필요해 보이면 specificity와 소유 경계를 다시 설계한다.
- 관련 속성은 위치·박스·타이포·색·모션처럼 읽히는 그룹으로 둔다. 같은 shorthand와
  longhand를 충돌하게 섞지 않는다.
- 지원 브라우저에서 안정된 표준 기능을 사용하고 deprecated/prefixed 기능을 새로 추가하지
  않는다.
- hover만으로 정보를 전달하지 않고 `:focus-visible`, disabled, reduced-motion 상태를
  함께 설계한다.
- 애니메이션은 합성 가능한 속성을 선호하며 매 프레임 layout thrashing을 만들지 않는다.

## 10. JSON과 TOML

### 10.1 JSON

JSON은 [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)의 상호운용 규칙을 따른다.

- UTF-8, 큰따옴표, 유일한 object key를 MUST 사용한다.
- 주석, trailing comma, `NaN`, `Infinity`를 사용하지 않는다.
- object key 순서에 의미를 부여하지 않는다. 순서가 계약이면 array로 표현한다.
- JavaScript에서 정확히 왕복해야 하는 정수는 안전 정수 범위를 벗어나지 않는다.
- 런타임 데이터는 `schemaVersion`과 안정 ID를 유지하고 모든 참조 무결성을 검증한다.
- `client/src/game/data`는 현재 전환용 fixture다. 장기 서버 정본과 표시용 사본을 혼동하지
  않는다.
- 프로토콜 fixture를 변경하면 Rust와 Vitest 양쪽 round-trip 테스트를 실행한다.

### 10.2 TOML

TOML은 [TOML 1.0 specification](https://toml.io/en/v1.0.0)을 따른다.

- UTF-8과 case-sensitive key를 사용하고 같은 key를 중복 정의하지 않는다.
- Cargo dependency는 일반 dependency와 dev dependency 등 의미 있는 section에 둔다.
- 관련 dependency를 안정적으로 정렬하고 feature는 필요한 최소만 활성화한다.
- 여러 줄 inline table을 만들지 않는다. 읽기 어려워지면 표준 table이나 별도 section을
  사용한다.
- `Cargo.lock`은 Cargo가 갱신하게 하고 수동으로 편집하지 않는다.

## 11. Markdown

Markdown은 [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)와 GitHub 렌더링을
기준으로 한다.

- 문서당 H1은 하나로 두고 heading level을 건너뛰지 않는다.
- heading, 목록, fenced code block 앞뒤에는 빈 줄을 둔다.
- 코드 fence에는 `rust`, `typescript`, `bash`, `json`, `text`처럼 정확한 언어를 지정한다.
- 저장소 파일 링크는 상대 경로를 사용하고 이동 시 함께 갱신한다.
- 명령 예시는 실제 실행 위치와 전제 조건을 명시한다.
- 사실, 현재 상태, 향후 계획을 구분한다. 미구현 기능을 현재 동작처럼 쓰지 않는다.
- 표에는 header separator를 두고 셀 안의 긴 설명은 문장보다 짧은 구로 유지한다.
- 문서 변경 후 깨진 상대 링크, placeholder, `TODO`/`TBD`, 오래된 버전·경로를 검사한다.

## 12. 테스트와 검증 표준

### 12.1 테스트 선택

- 순수 계산과 상태 전이: 빠른 단위 테스트
- 직렬화, 파일, WebSocket, 프레임워크 경계: 좁은 통합 또는 계약 테스트
- 브라우저 입력·렌더·WebGL 흐름: 자동화 가능한 브라우저 테스트와 수동 smoke test
- Rust/TypeScript 프로토콜: 같은 골든 JSON fixture를 읽는 양쪽 테스트

테스트 수나 coverage 비율만으로 품질을 판정하지 않는다. 핵심 불변식, 실패 경로, 경계값,
cleanup을 실제로 깨뜨렸을 때 테스트가 실패하는지가 기준이다.

### 12.2 현재 필수 검증 명령

저장소 전체 변경은 관련 테스트를 먼저 실행한 뒤 아래 전체 검증을 수행한다.

```bash
# repository root
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace -- -D warnings
node scripts/validate-runtime-data.mjs
git diff --check

# client
cd client
npm run check
npx vitest run
npm run build
```

서버 네트워크나 브라우저 흐름을 바꿨다면 실행 smoke test를 추가한다.

```bash
# repository root
cargo run -p rune-dungeon-server -- --addr 127.0.0.1:0
```

고정 포트가 필요한 수동 브라우저 확인에서는 `127.0.0.1:8080`을 사용하고 확인 후 프로세스를
종료한다.

## 13. Proposed 자동화

다음은 별도 계획과 승인 후 도입한다. 도입 전에는 실행 명령이나 CI 통과를 요구하지 않는다.

| 도구 | 목적 | 권장 기준 |
|---|---|---|
| Prettier + Svelte plugin | TS, Svelte, JS, CSS, JSON, Markdown 포맷 | 이 문서의 작은따옴표·세미콜론·100자 목표 반영 |
| ESLint | JavaScript 기본 오류 | `@eslint/js` recommended |
| typescript-eslint | 타입 인지 정적 분석 | `recommendedTypeChecked`부터 시작 |
| eslint-plugin-svelte | Svelte AST와 접근성 점검 | official recommended config |
| markdownlint | Markdown 구조와 공백 | 저장소 문서 관례에 맞춘 최소 예외 |
| EditorConfig | 인코딩, LF, 들여쓰기, final newline | 언어별 formatter와 충돌하지 않게 구성 |

Clippy의 `pedantic`, `restriction`, `nursery` 그룹을 통째로 deny하지 않는다. Clippy 공식 문서가
경고하듯 오탐과 상충 규칙이 있으므로 필요한 lint만 근거와 함께 개별 채택한다. 같은 원칙을
ESLint의 stylistic·strict preset에도 적용한다.

## 14. 출처

아래 웹 자료를 2026-08-05에 확인했다.

### Rust

- [Rust Style Guide](https://doc.rust-lang.org/style-guide/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Clippy Documentation](https://doc.rust-lang.org/clippy/)

### TypeScript, Svelte, 웹

- [TypeScript `strict`](https://www.typescriptlang.org/tsconfig/strict.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting/)
- [Svelte: TypeScript](https://svelte.dev/docs/svelte/typescript)
- [Svelte compiler warnings](https://svelte.dev/docs/svelte/compiler-warnings)
- [Official ESLint plugin for Svelte](https://sveltejs.github.io/eslint-plugin-svelte/)
- [Prettier rationale](https://prettier.io/docs/rationale)
- [MDN HTML code style](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/HTML)
- [MDN CSS code style](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/CSS)

### 데이터와 문서

- [RFC 8259: JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)
- [TOML v1.0.0](https://toml.io/en/v1.0.0)
- [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)

이 문서는 외부 가이드를 그대로 복제하지 않는다. 외부 가이드는 일반 원칙의 근거이며,
Rune Dungeon의 승인된 권위·프로토콜·렌더링 계약이 구체 규칙의 최종 기준이다.
