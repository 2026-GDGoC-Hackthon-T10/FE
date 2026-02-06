// games/data/issues.js
export const issues = {
    1: {
        id: 1,
        type: "code_review",
        title: "CODE REVIEW · 첫 코멘트",
        story: "PR #218: 제출 서버 핫픽스. 배포 직전이라 리뷰 한 줄이 흐름을 좌우한다.",
        context: {
            file: "src/api/submitClient.js",
            hint: "배포 직전: '지금 당장 터질 리스크'부터 막아라.",
        },
        code: `// src/api/submitClient.js
export async function submit(payload) {
  const res = await fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // NOTE: server sometimes returns 500 with HTML
  const data = await res.json();
  return data.result;
}`,

        options: [
            {
                id: "a",
                label: "res.ok 체크 + 실패 응답 처리 먼저",
                tone: "danger",
                rationale: "500/HTML이면 res.json()에서 바로 터짐. 지금은 크래시 차단이 최우선.",
                next: 2,
            },
            {
                id: "b",
                label: "함수명/주석 정리",
                tone: "neutral",
                rationale: "가독성은 개선되지만, 배포 직전 크래시를 막진 못함.",
                next: 1,
                penalty: true,
            },
            {
                id: "c",
                label: "payload 압축/캐싱 제안",
                tone: "neutral",
                rationale: "성능 개선은 다음 스프린트. 지금은 장애 차단이 우선.",
                next: 1,
                penalty: true,
            },
        ],

        game: {
            mode: "drag_patch",
            patchLabel: "PATCH",
            spawn: [
                { x: 18, y: 24, optionId: "b" },
                { x: 70, y: 30, optionId: "a" },
                { x: 42, y: 66, optionId: "c" },
            ],
            correctOptionId: "a",
        },

        success: {
            title: "코멘트 전송 성공",
            message: "좋아. 크래시 포인트부터 막는다. 다음은 실제로 어디서 터지는지 추적해.",
        },
        fail: {
            title: "전송 실패",
            message: "지금은 스타일/성능보다 장애 차단이 먼저다. 다시 선택해.",
        },
    },

    2: {
        id: 2,
        type: "bug_spotting",
        title: "BUG SPOTTING · 지우개로 봉인",
        story: "방금 그 크래시가 실제로 발생 중이다. 지우개로 ‘원인 라인’을 지워 봉인해.",
        context: {
            file: "src/api/submitClient.js",
            hint: "HTML/500이면 JSON 파싱에서 폭발한다.",
        },

        codeLines: [
            { n: 1, t: "// src/api/submitClient.js" },
            { n: 2, t: "export async function submit(payload) {" },
            { n: 3, t: '  const res = await fetch("/submit", {' },
            { n: 4, t: '    method: "POST",' },
            { n: 5, t: '    headers: { "Content-Type": "application/json" },' },
            { n: 6, t: "    body: JSON.stringify(payload)," },
            { n: 7, t: "  });" },
            { n: 8, t: "" },
            { n: 9, t: "  // NOTE: server sometimes returns 500 with HTML" },
            { n: 10, t: "  const data = await res.json();" },
            { n: 11, t: "  return data.result;" },
            { n: 12, t: "}" },
        ],

        answer: {
            line: 10,
            explain: "res.ok 체크 없이 res.json()을 호출하면 HTML/빈 응답에서 파싱 에러로 크래시.",
        },

        game: {
            mode: "erase_line",
            erasesRequired: 1,
            correctLine: 10,
        },

        success: {
            title: "봉인 완료",
            message: "좋아. 이제 여기서 res.ok 분기 + 안전 파싱을 넣으면 된다.",
        },
        fail: {
            title: "봉인 실패",
            message: "증상(HTML/500)과 직접 연결된 라인을 다시 찾아.",
        },
    },

    3: {
        id: 3,
        type: "git_command",
        title: "GIT COMMAND · 낙하 코드 입력",
        story: "핫픽스 반영 중 터미널이 난장판이다. 상황에 맞는 정확한 명령어로 끊어.",
        context: {
            file: "terminal",
            hint: "아래 '상황'에 맞는 명령어를 입력해. (떨어지는 코드들은 방해물)",
        },
        game: {
            mode: "type_fall_multi",

            prompt: "원격 저장소를 로컬로 복제해야 한다. (clone)",

            answer: "git clone (repo-url)",

            pool: [
                "git pull",
                "git fetch",
                "git clone <repo-url>",
                "git checkout -b feature/x",
                "git rebase --abort",
                "git merge --abort",
                "git reset --hard HEAD",
                "git stash",
                "git revert HEAD",
            ],

            spawnEveryMs: 900,
            fallTimeMs: 12000,
            maxOnScreen: 6,
        },
    },

    4: {
            id: 4,
            type: "cs_ox",
            title: "CS OX · 미로 짝짓기",
            story:
                "Git 충돌의 근본 원인을 추적하다 보니 결국 ‘이벤트 루프/메모리/네트워크’까지 내려왔다. O/X를 미로로 분류해라.",
            context: {
                file: "runtime",
                hint: "각 문장을 주워서 O 또는 X 구역에 가져다 놓으면 된다.",
            },
            game: {
                mode: "maze_ox",
                statements: [
                    { id: "s1", text: "JS는 단일 스레드지만 I/O는 이벤트 루프로 비동기 처리된다.", truth: true },
                    { id: "s2", text: "GC는 메모리 누수를 100% 자동으로 방지한다.", truth: false },
                    { id: "s3", text: "TCP는 패킷 순서를 보장한다.", truth: true },
                    { id: "s4", text: "DNS는 애플리케이션 레이어(7계층) 프로토콜이다.", truth: true },
                ],
                grid: [
                    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
                    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
                    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
                    [1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],
                    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
                    [1,1,1,1,0,1,1,1,1,0,1,1,1,0,1],
                    [1,0,0,1,0,0,0,0,1,0,0,0,1,0,1],
                    [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
                    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
                    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                ],
                start: { r: 1, c: 1 },
                zoneO: { r: 1, c: 13 },
                zoneX: { r: 9, c: 13 },

                tokens: [
                    { id: "s1", r: 3, c: 3 },
                    { id: "s2", r: 5, c: 4 },
                    { id: "s3", r: 7, c: 6 },
                    { id: "s4", r: 9, c: 8 },
                ],
            },
    },


    5: {
        id: 5,
        type: "trade_off",
        title: "TRADE-OFF · 가위바위보 설계전",
        story:
            "요구사항이 동시에 터졌다. (1) 목록 스크롤 성능 (2) 오프라인에서도 최근 데이터 (3) 즉시 반영 UX. 하나로 다 잡으려다 구조가 망가진다.",
        context: {
            file: "state/architecture",
            hint: "“서버 상태”와 “클라 UI 상태”를 분리해. 캐싱은 서버 상태 전용이 정답.",
        },

        options: [
            {
                id: "a",
                label: "서버 상태: React Query 캐싱 / UI 상태: 로컬(또는 Zustand)로 분리",
                tone: "good",
                rationale:
                    "서버 데이터는 캐싱/무효화/재시도/동기화가 핵심. UI 상태(필터, 모달, 입력)는 별도 관리가 안정적.",
            },
            {
                id: "b",
                label: "전부 전역 상태(Redux)로 통합 + API 응답도 직접 저장",
                tone: "danger",
                rationale:
                    "서버 상태까지 전역에 끌고 오면 무효화/동기화/경합이 복잡해져 유지보수 지옥 + 불필요 렌더링 증가.",
            },
            {
                id: "c",
                label: "캐싱 없이 요청마다 fetch, 대신 메모이제이션으로 성능만 튜닝",
                tone: "neutral",
                rationale:
                    "네트워크/오프라인/중복 요청 문제를 성능 튜닝으로 못 막음. ‘최근 데이터 유지’ 요구사항을 바로 위반.",
            },
        ],

        game: {
            mode: "rps_tradeoff",
            enemy: {
                hand: "rock",
                tag: "GLOBAL STATE TEMPTATION",
                line: "“한 군데에 다 넣으면 편하잖아?”",
            },
            correctHand: "paper",
            correctOptionId: "a",
        },

        success: {
            title: "설계 승리",
            message:
                "서버 상태는 캐싱 레이어로, UI 상태는 얇게. 트레이드오프를 분리하면 성능/오프라인/즉시 반영이 동시에 풀린다.",
        },
        fail: {
            title: "설계 패배",
            message:
                "전역 통합/무캐싱/성능만 집착 중 하나로 쏠렸다. 요구사항이 많을수록 ‘분리’가 먼저다.",
        },
    },

    6: {
        id: 6,
        type: "incident",
        title: "INCIDENT · 장애 났을 때 첫 조치",
        story:
            "배포 직후 5xx 급증. 슬랙이 불탄다. 지금 너의 첫 30초가 팀을 살린다.",
        context: {
            file: "oncall/runbook",
            hint: "첫 조치: (1) 영향 범위 확인 → (2) 출혈(에러) 멈추기 → (3) 원인 파고들기",
        },

        game: {
            mode: "rhythm_triage",
            bpm: 112,
            leadInMs: 900,
            hitWindowMs: 160,
            missLimit: 1,

            lanes: [
                { id: 1, label: "영향 범위 확인", sub: "대상/지표/기간" },
                { id: 2, label: "출혈 차단", sub: "롤백/플래그 off" },
                { id: 3, label: "원인 추적", sub: "로그/트레이스" },
            ],

            pattern: [
                { t: 1200, lane: 1 },
                { t: 1700, lane: 2 },
                { t: 2200, lane: 3 },
                { t: 2700, lane: 1 },
                { t: 3200, lane: 2 },
                { t: 3700, lane: 3 },
            ],
        },

        success: {
            title: "초동 대응 성공",
            message:
                "좋아. 범위 파악 → 출혈 차단으로 고객 피해를 먼저 줄였다. 이제 근본 원인으로 들어가자.",
        },
        fail: {
            title: "초동 대응 실패",
            message:
                "순서가 꼬이면 ‘조사’가 ‘피해 확산’보다 앞서게 된다. 먼저 멈추고, 그다음 파라.",
        },
    },



};
