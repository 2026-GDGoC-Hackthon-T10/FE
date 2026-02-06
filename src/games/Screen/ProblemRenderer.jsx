// games/Screen/ProblemRenderer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * ✅ 한 파일에서 끝
 * ✅ 6개 유형 전부 분기 + 화면 포함
 * - 1) drag_patch
 * - 2) erase_line
 * - 3) type_fall_multi
 * - 4) maze_ox
 * - 5) rps_tradeoff
 * - 6) rhythm_triage
 *
 * ✅ 백엔드: 선지 텍스트 + 정답만 제공(quiz/random, quiz/{id}, submit)
 * - question: { title, content, options: string[] } 형태라고 가정(네 IssueStage에서 정규화 가능)
 * - submitAnswer(selectedText): Promise<{ ok:boolean, answer?:string, message?:string, explanation?:string }>
 */

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function getProblemType(issueId) {
    switch (Number(issueId)) {
        case 1:
            return "drag_patch";
        case 2:
            return "erase_line";
        case 3:
            return "type_fall_multi";
        case 4:
            return "maze_ox";
        case 5:
            return "rps_tradeoff";
        case 6:
            return "rhythm_triage";
        default:
            return "type_fall_multi";
    }
}

function cls(...xs) {
    return xs.filter(Boolean).join(" ");
}

export default function ProblemRenderer({
                                            issueId,
                                            question, // { title, content, options: string[] } (선지 텍스트 배열)
                                            loading,
                                            error,
                                            onRetry,
                                            disabled,

                                            submitAnswer, // async(selectedText) => {ok, answer, message, explanation}
                                            onResolved, // (res) => void
                                        }) {
    const type = useMemo(() => getProblemType(issueId), [issueId]);

    if (loading) return <div className="stageHint">불러오는 중…</div>;

    if (error) {
        return (
            <div className="stageError">
                {error}
                <div className="stageActions">
                    <button className="btnGhost" type="button" onClick={onRetry}>
                        다시 불러오기
                    </button>
                </div>
            </div>
        );
    }

    if (!question) return null;

    const commonProps = {
        issueId,
        question,
        disabled,
        submitAnswer,
        onResolved,
    };

    switch (type) {
        case "drag_patch":
            return <DragPatchProblem {...commonProps} />;

        case "erase_line":
            return <EraseLineProblem {...commonProps} />;

        case "type_fall_multi":
            return <TypeFallMultiProblem {...commonProps} />;

        case "maze_ox":
            return <MazeOXProblem {...commonProps} />;

        case "rps_tradeoff":
            return <RpsTradeoffProblem {...commonProps} />;

        case "rhythm_triage":
            return <RhythmTriageProblem {...commonProps} />;

        default:
            return <TypeFallMultiProblem {...commonProps} />;
    }
}

/* =========================
 *  1) drag_patch
 *  - PATCH draggable -> 타겟 드롭으로 선택
 *  - 제출 시 선택된 "선지 텍스트"를 submitAnswer로 전송
 * ========================= */
function DragPatchProblem({ question, disabled, submitAnswer, onResolved }) {
    const options = Array.isArray(question.options) ? question.options : [];
    const [selected, setSelected] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setSelected("");
        setSubmitting(false);
    }, [question]);

    const onDragStart = (e) => {
        e.dataTransfer.setData("text/plain", "PATCH");
    };
    const onDragOver = (e) => e.preventDefault();
    const onDropTarget = (opt) => (e) => {
        e.preventDefault();
        if (disabled || submitting) return;
        setSelected(String(opt));
    };

    const submit = useCallback(async () => {
        if (!selected || disabled || submitting) return;
        try {
            setSubmitting(true);
            const res = await submitAnswer(String(selected));
            onResolved?.(res);
        } finally {
            setSubmitting(false);
        }
    }, [selected, disabled, submitting, submitAnswer, onResolved]);

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "PATCH를 정답 타겟에 드롭해."}</div>

            <div className="patchBoard">
                <div className="patchChip" draggable onDragStart={onDragStart}>
                    PATCH
                </div>

                <div className="patchTargets">
                    {options.map((opt, i) => {
                        const v = String(opt);
                        const active = selected === v;
                        return (
                            <div
                                key={`${v}-${i}`}
                                className={cls("patchTarget", active && "active")}
                                onDrop={onDropTarget(v)}
                                onDragOver={onDragOver}
                            >
                                <div className="patchTargetK">TARGET</div>
                                <div className="patchTargetT">{v}</div>
                                <div className="patchTargetS">drop PATCH</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="stageActions">
                <button className="btnPrimary" type="button" onClick={submit} disabled={!selected || disabled || submitting}>
                    {submitting ? "적용 중…" : "패치 적용"}
                </button>
            </div>

            <div className="stageHint">선택: {selected || "없음"}</div>
        </div>
    );
}

/* =========================
 *  2) erase_line
 *  - question.options를 "라인 후보"로 사용 (문자열)
 *  - 클릭한 라인 1개만 봉인(선택)
 *  - 제출 시 선택된 라인을 submitAnswer로 전송
 * ========================= */
function EraseLineProblem({ question, disabled, submitAnswer, onResolved }) {
    const lines = Array.isArray(question.options) ? question.options : [];
    const [picked, setPicked] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setPicked("");
        setSubmitting(false);
    }, [question]);

    const submit = useCallback(async () => {
        if (!picked || disabled || submitting) return;
        try {
            setSubmitting(true);
            const res = await submitAnswer(String(picked));
            onResolved?.(res);
        } finally {
            setSubmitting(false);
        }
    }, [picked, disabled, submitting, submitAnswer, onResolved]);

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "문제 라인을 클릭해서 봉인해."}</div>

            <div className="eraseBox">
                {lines.map((t, i) => {
                    const v = String(t);
                    const active = picked === v;
                    return (
                        <button
                            key={`${v}-${i}`}
                            type="button"
                            className={cls("eraseLineBtn", active && "active")}
                            onClick={() => setPicked(v)}
                            disabled={disabled || submitting}
                        >
                            <span className="eraseNo">{i + 1}</span>
                            <span className="eraseText">{v}</span>
                        </button>
                    );
                })}
            </div>

            <div className="stageActions">
                <button className="btnPrimary" type="button" onClick={submit} disabled={!picked || disabled || submitting}>
                    {submitting ? "봉인 중…" : "봉인"}
                </button>
            </div>

            <div className="stageHint">선택: {picked || "없음"}</div>
        </div>
    );
}

/* =========================
 *  3) type_fall_multi
 *  - 떨어지는 방해물(오답 후보) 표시 + 정답 명령어 타이핑
 *  - 서버 정답은 "선지 텍스트" 중 하나라고 가정:
 *    => submitAnswer(typedText)로 그대로 보냄
 *  - 정답判定은 서버 submit 결과로 처리(프론트는 타이핑 게임만)
 * ========================= */
function TypeFallMultiProblem({ question, disabled, submitAnswer, onResolved }) {
    const pool = Array.isArray(question.options) ? question.options : [];
    const answerHint = ""; // 서버 정답을 프론트가 모른다는 전제면 빈 값. (서버가 answer 주면 연결 가능)
    const [started, setStarted] = useState(false);
    const [typed, setTyped] = useState("");
    const [drops, setDrops] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const runRef = useRef(false);
    const spawnRef = useRef(null);
    const rafRef = useRef(null);
    const idRef = useRef(1);

    useEffect(() => {
        setStarted(false);
        setTyped("");
        setDrops([]);
        setSubmitting(false);

        runRef.current = false;
        if (spawnRef.current) clearInterval(spawnRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        spawnRef.current = null;
        rafRef.current = null;
    }, [question]);

    const start = useCallback(() => {
        if (disabled || submitting) return;
        if (runRef.current) return;
        runRef.current = true;
        setStarted(true);
        setDrops([]);
        setTyped("");

        const fallTimeMs = 9000;
        const spawnEveryMs = 700;
        const maxOn = 7;

        spawnRef.current = setInterval(() => {
            if (!runRef.current) return;
            setDrops((prev) => {
                if (prev.length >= maxOn) return prev;
                const pick = pool.length ? String(pool[Math.floor(Math.random() * pool.length)]) : "git status";
                const now = performance.now();
                return [...prev, { id: idRef.current++, text: pick, at: now, y: 0 }];
            });
        }, spawnEveryMs);

        const tick = (t) => {
            if (!runRef.current) return;
            setDrops((prev) =>
                prev
                    .map((d) => {
                        const p = clamp((t - d.at) / fallTimeMs, 0, 1);
                        return { ...d, y: p * 100 };
                    })
                    .filter((d) => d.y < 98)
            );
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [pool, disabled, submitting]);

    const stop = useCallback(() => {
        runRef.current = false;
        if (spawnRef.current) clearInterval(spawnRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        spawnRef.current = null;
        rafRef.current = null;
    }, []);

    useEffect(() => () => stop(), [stop]);

    const submit = useCallback(
        async (e) => {
            e?.preventDefault?.();
            if (!started || disabled || submitting) return;
            const text = typed.trim();
            if (!text) return;

            stop();

            try {
                setSubmitting(true);
                const res = await submitAnswer(text);
                onResolved?.(res);
            } finally {
                setSubmitting(false);
            }
        },
        [started, typed, disabled, submitting, stop, submitAnswer, onResolved]
    );

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "정답 명령어를 정확히 입력해."}</div>

            <div className="typeFallLane">
                {!started && (
                    <button className="btnPrimary" type="button" onClick={start} disabled={disabled || submitting}>
                        START
                    </button>
                )}

                {drops.map((d) => (
                    <div key={d.id} className="typeFallDrop" style={{ top: `${d.y}%` }}>
                        <span className="typeFallCode">{d.text}</span>
                    </div>
                ))}
                <div className="typeFallFloor" />
            </div>

            <form className="typeFallInputRow" onSubmit={submit}>
                <input
                    className="typeFallInput"
                    value={typed}
                    onFocus={() => {
                        if (!started) start();
                    }}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="명령어 입력…"
                    disabled={disabled || submitting}
                />
                <button className="btnPrimary" type="submit" disabled={!typed.trim() || disabled || submitting}>
                    {submitting ? "제출 중…" : "입력"}
                </button>
            </form>

            <div className="stageHint">{answerHint ? `힌트: ${answerHint}` : "떨어지는 건 방해물"}</div>
        </div>
    );
}

/* =========================
 *  4) maze_ox
 *  - 진짜 미로 최소: 토큰 선택 -> O/X 구역 버튼
 *  - 서버가 선지/정답만이므로, "토큰@O" 형태를 선택 텍스트로 제출
 * ========================= */
function MazeOXProblem({ question, disabled, submitAnswer, onResolved }) {
    const base = Array.isArray(question.options) ? question.options : [];
    const tokens = base.length ? base.slice(0, 4) : ["A", "B", "C", "D"];
    const [picked, setPicked] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setPicked("");
        setSubmitting(false);
    }, [question]);

    const submitZone = useCallback(
        async (zone) => {
            if (!picked || disabled || submitting) return;
            try {
                setSubmitting(true);
                const payload = `${String(picked)}@${zone}`;
                const res = await submitAnswer(payload);
                onResolved?.(res);
            } finally {
                setSubmitting(false);
            }
        },
        [picked, disabled, submitting, submitAnswer, onResolved]
    );

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "토큰을 골라 O/X에 배치해."}</div>

            <div className="mazeRow">
                {tokens.map((t) => {
                    const v = String(t);
                    const active = picked === v;
                    return (
                        <button
                            key={v}
                            type="button"
                            className={cls("mazeTokenBtn", active && "active")}
                            onClick={() => setPicked(v)}
                            disabled={disabled || submitting}
                        >
                            {v}
                        </button>
                    );
                })}
            </div>

            <div className="mazeZones">
                <button className="btnPrimary" type="button" onClick={() => submitZone("O")} disabled={!picked || disabled || submitting}>
                    O 구역
                </button>
                <button className="btnGhost" type="button" onClick={() => submitZone("X")} disabled={!picked || disabled || submitting}>
                    X 구역
                </button>
            </div>

            <div className="stageHint">선택: {picked ? `${picked}` : "없음"}</div>
        </div>
    );
}

/* =========================
 *  5) rps_tradeoff
 *  - 가위바위보 3개 버튼
 *  - 서버 채점은 "선지 텍스트" 기반이라고 했으니:
 *    => 각 손에 매핑되는 옵션 텍스트를 submitAnswer로 제출
 * ========================= */
function RpsTradeoffProblem({ question, disabled, submitAnswer, onResolved }) {
    const opts = Array.isArray(question.options) ? question.options : [];
    const [submitting, setSubmitting] = useState(false);

    // 옵션이 3개가 아니면 임시로 만든다
    const mapped = useMemo(() => {
        const a = String(opts[0] ?? "안전하게 롤백");
        const b = String(opts[1] ?? "빠르게 핫픽스");
        const c = String(opts[2] ?? "근본 리팩터");
        return {
            rock: b,
            paper: a,
            scissors: c,
        };
    }, [opts]);

    useEffect(() => {
        setSubmitting(false);
    }, [question]);

    const pick = useCallback(
        async (hand) => {
            if (disabled || submitting) return;
            const payload = mapped[hand];
            try {
                setSubmitting(true);
                const res = await submitAnswer(String(payload));
                onResolved?.(res);
            } finally {
                setSubmitting(false);
            }
        },
        [disabled, submitting, mapped, submitAnswer, onResolved]
    );

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "손을 골라 트레이드오프를 결정해."}</div>

            <div className="rpsGrid">
                <button className="rpsCard" type="button" onClick={() => pick("rock")} disabled={disabled || submitting}>
                    <div className="rpsIcon">✊</div>
                    <div className="rpsHand">ROCK</div>
                    <div className="rpsOpt">{mapped.rock}</div>
                </button>

                <button className="rpsCard" type="button" onClick={() => pick("paper")} disabled={disabled || submitting}>
                    <div className="rpsIcon">✋</div>
                    <div className="rpsHand">PAPER</div>
                    <div className="rpsOpt">{mapped.paper}</div>
                </button>

                <button className="rpsCard" type="button" onClick={() => pick("scissors")} disabled={disabled || submitting}>
                    <div className="rpsIcon">✌️</div>
                    <div className="rpsHand">SCISSORS</div>
                    <div className="rpsOpt">{mapped.scissors}</div>
                </button>
            </div>

            <div className="stageHint">{submitting ? "채점 중…" : "탭하면 즉시 제출"}</div>
        </div>
    );
}

/* =========================
 *  6) rhythm_triage
 *  - START 후, NEXT 레인 표시
 *  - 버튼을 누르면 타이밍 판정(±window)
 *  - 타이밍 OK면 "정답 선지"를 서버로 제출(서버가 answer를 같이 주면 사용)
 *    아니면 그냥 누른 레인 텍스트를 제출(서버가 채점)
 * ========================= */
function RhythmTriageProblem({ question, disabled, submitAnswer, onResolved }) {
    const lanes = Array.isArray(question.options) ? question.options : [];
    const correctText = String(question.answer ?? ""); // 서버가 주면 사용
    const [started, setStarted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [idx, setIdx] = useState(0);
    const [miss, setMiss] = useState(0);

    const startAtRef = useRef(0);
    const rafRef = useRef(null);
    const [nowMs, setNowMs] = useState(0);

    const pattern = useMemo(() => {
        // 최소 패턴: 3번 박자
        return [
            { t: 700, lane: 0 },
            { t: 1400, lane: 1 },
            { t: 2100, lane: 2 },
        ];
    }, []);

    const hitWindowMs = 180;
    const missLimit = 1;
    const leadInMs = 600;
    const totalMs = pattern[pattern.length - 1].t + 700;

    useEffect(() => {
        setStarted(false);
        setSubmitting(false);
        setIdx(0);
        setMiss(0);
        setNowMs(0);
        startAtRef.current = 0;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, [question]);

    const start = useCallback(() => {
        if (disabled || submitting) return;
        if (started) return;
        setStarted(true);
        setIdx(0);
        setMiss(0);
        setNowMs(0);
        startAtRef.current = performance.now() + leadInMs;

        const tick = (t) => {
            const ms = t - startAtRef.current;
            setNowMs(ms);

            if (ms > totalMs + 120) {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
                setStarted(false);
            } else {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
    }, [disabled, submitting, started, leadInMs, totalMs]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const finish = useCallback(
        async (okPayloadText) => {
            try {
                setSubmitting(true);
                const res = await submitAnswer(String(okPayloadText));
                onResolved?.(res);
            } finally {
                setSubmitting(false);
            }
        },
        [submitAnswer, onResolved]
    );

    const hit = useCallback(
        async (laneIndex) => {
            if (!started || disabled || submitting) return;

            const cur = pattern[idx];
            if (!cur) return;

            const dt = Math.abs(nowMs - cur.t);
            const correctLane = laneIndex === cur.lane && dt <= hitWindowMs;

            if (correctLane) {
                const nextIdx = idx + 1;
                setIdx(nextIdx);

                if (nextIdx >= pattern.length) {
                    // ✅ 전부 성공: 서버에 "정답"을 보내야 하면 correctText 사용
                    // (없으면 마지막으로 누른 lane 텍스트)
                    const payload = correctText || String(lanes[laneIndex] ?? `lane${laneIndex + 1}`);
                    await finish(payload);
                }
                return;
            }

            const nextMiss = miss + 1;
            setMiss(nextMiss);
            if (nextMiss > missLimit) {
                const payload = String(lanes[laneIndex] ?? `lane${laneIndex + 1}`);
                await finish(payload);
            }
        },
        [started, disabled, submitting, pattern, idx, nowMs, hitWindowMs, miss, missLimit, lanes, correctText, finish]
    );

    const fillPct = useMemo(() => {
        const denom = totalMs + leadInMs;
        const numer = nowMs + leadInMs;
        return clamp((numer / denom) * 100, 0, 100);
    }, [nowMs, totalMs, leadInMs]);

    const nextLaneIdx = pattern[idx]?.lane ?? null;
    const nextLabel = nextLaneIdx != null ? String(lanes[nextLaneIdx] ?? `lane${nextLaneIdx + 1}`) : "끝";

    return (
        <div className="stagePlay">
            <div className="stageQuestion">{question.content || "START 후 타이밍에 맞춰 레인을 눌러."}</div>

            <div className="rhTop">
                <button className="btnPrimary" type="button" onClick={start} disabled={started || disabled || submitting}>
                    {started ? "진행 중" : "START"}
                </button>

                <div className="rhMeta">
          <span>
            진행 {idx}/{pattern.length}
          </span>
                    <span>MISS {miss}/{missLimit}</span>
                </div>
            </div>

            <div className="rhBar">
                <div className="rhBarFill" style={{ width: `${fillPct}%` }} />
            </div>

            <div className="rhLaneRow">
                {lanes.map((l, i) => (
                    <button
                        key={`${String(l)}-${i}`}
                        type="button"
                        className="rhLaneBtn"
                        onClick={() => hit(i)}
                        disabled={!started || disabled || submitting}
                    >
                        <div className="rhLaneK">{i + 1}</div>
                        <div className="rhLaneT">{String(l)}</div>
                        <div className="rhLaneS">tap</div>
                    </button>
                ))}
            </div>

            <div className="rhNext">NEXT: {nextLabel}</div>
            <div className="stageHint">±{hitWindowMs}ms</div>
        </div>
    );
}
