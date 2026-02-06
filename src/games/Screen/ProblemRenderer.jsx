// games/Screen/ProblemRenderer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./IssuePage.css";

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
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
                                            question,
                                            loading,
                                            error,
                                            onRetry,
                                            disabled,
                                            submitAnswer,
                                            onResolved,
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
 * ========================= */
function DragPatchProblem({ question, disabled, submitAnswer, onResolved }) {
    const targets = Array.isArray(question.options) ? question.options : [];
    const [picked, setPicked] = useState("");
    const [hoverIdx, setHoverIdx] = useState(-1);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setPicked("");
        setHoverIdx(-1);
        setSubmitting(false);
    }, [question]);

    const onDragStart = useCallback(
        (e) => {
            if (disabled || submitting) return;
            e.dataTransfer.setData("text/plain", "PATCH");
            e.dataTransfer.effectAllowed = "move";
        },
        [disabled, submitting]
    );

    const onDragOver = useCallback(
        (idx) => (e) => {
            if (disabled || submitting) return;
            e.preventDefault();
            setHoverIdx(idx);
        },
        [disabled, submitting]
    );

    const onDrop = useCallback(
        (idx) => (e) => {
            if (disabled || submitting) return;
            e.preventDefault();
            setHoverIdx(-1);
            const v = String(targets[idx] ?? "");
            if (v) setPicked(v);
        },
        [disabled, submitting, targets]
    );

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
            <div className="stageQuestion">{question.content || "PATCH를 타겟에 드롭해."}</div>

            <div className="patchBoard">
                <div className="patchChip" draggable={!disabled && !submitting} onDragStart={onDragStart}>
                    PATCH
                </div>

                <div className="patchTargets">
                    {targets.map((t, idx) => {
                        const v = String(t);
                        const active = picked === v;
                        return (
                            <div
                                key={`${v}-${idx}`}
                                className={cls("patchTarget", hoverIdx === idx && "active", active && "active")}
                                onDragOver={onDragOver(idx)}
                                onDragLeave={() => setHoverIdx(-1)}
                                onDrop={onDrop(idx)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="patchTargetK">TARGET</div>
                                <div className="patchTargetT">{v}</div>
                                <div className="patchTargetS">{active ? "선택됨" : "drop PATCH"}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="stageActions">
                <button className="btnPrimary" type="button" onClick={submit} disabled={!picked || disabled || submitting}>
                    {submitting ? "적용 중…" : "패치 적용"}
                </button>
            </div>

            <div className="stageHint">선택: {picked || "없음"}</div>
        </div>
    );
}

/* =========================
 *  2) erase_line
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
 * ========================= */
function TypeFallMultiProblem({ question, disabled, submitAnswer, onResolved }) {
    const pool = Array.isArray(question.options) ? question.options : [];
    const answerHint = "";
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
 *  4) maze_ox  ✅ 원(플레이어) 조작 미로
 *  - '1' = 벽, '0' = 길, 'O'/'X' = 목표
 *  - 원(플레이어)을 드래그(터치) 또는 WASD/방향키로 이동
 *  - O/X에 도착하면 즉시 submitAnswer("O") / submitAnswer("X")
 * ========================= */

const DEFAULT_MAZE_15x11 = [
    "111111111111111",
    "1S0000000000001",
    "101111011111101",
    "101000010000001",
    "101011110111101",
    "100010000100001",
    "111010111101111",
    "1000001000000O1",
    "101111101111101",
    "1X0000000000001",
    "111111111111111",
];

function normalizeMazeLines(lines) {
    const raw = Array.isArray(lines) && lines.length ? lines.map(String) : DEFAULT_MAZE_15x11;
    const rows = raw.length;
    const cols = Math.max(...raw.map((r) => r.length));
    const fixed = raw.map((r) => r.padEnd(cols, "1").slice(0, cols));
    return { rows, cols, grid: fixed.join(""), lines: fixed };
}

function MazeOXProblem({ question, disabled, submitAnswer, onResolved }) {
    const mazeLines = question?.maze || question?.map || question?.mazeLines || null;
    const { rows, cols, grid } = useMemo(() => normalizeMazeLines(mazeLines), [mazeLines]);

    const idxOf = useCallback((r, c) => r * cols + c, [cols]);
    const cellAt = useCallback((r, c) => grid[idxOf(r, c)] || "1", [grid, idxOf]);

    const findCell = useCallback(
        (ch) => {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (cellAt(r, c) === ch) return { r, c };
                }
            }
            return null;
        },
        [rows, cols, cellAt]
    );

    const startPos = useMemo(() => findCell("S") || { r: 1, c: 1 }, [findCell]);
    const [pos, setPos] = useState(startPos);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setPos(startPos);
        setSubmitting(false);
    }, [question, startPos]);

    const canMoveTo = useCallback(
        (r, c) => {
            if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
            const ch = cellAt(r, c);
            return ch !== "1";
        },
        [rows, cols, cellAt]
    );

    const tryMove = useCallback(
        async (nr, nc) => {
            if (disabled || submitting) return;
            if (!canMoveTo(nr, nc)) return;

            setPos({ r: nr, c: nc });

            const ch = cellAt(nr, nc);
            if (ch === "O" || ch === "X") {
                try {
                    setSubmitting(true);
                    const res = await submitAnswer(ch);
                    onResolved?.(res);
                } finally {
                    setSubmitting(false);
                }
            }
        },
        [disabled, submitting, canMoveTo, cellAt, submitAnswer, onResolved]
    );

    // ✅ 포커스/키 입력 안정화
    const rootRef = useRef(null);
    useEffect(() => {
        const t = setTimeout(() => rootRef.current?.focus?.(), 0);
        return () => clearTimeout(t);
    }, [question]);

    useEffect(() => {
        const onKey = (e) => {
            if (disabled || submitting) return;

            const tag = (e.target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea") return;

            const k = e.key;
            let dr = 0, dc = 0;

            if (k === "ArrowUp" || k === "w" || k === "W") dr = -1;
            else if (k === "ArrowDown" || k === "s" || k === "S") dr = 1;
            else if (k === "ArrowLeft" || k === "a" || k === "A") dc = -1;
            else if (k === "ArrowRight" || k === "d" || k === "D") dc = 1;
            else return;

            e.preventDefault();
            tryMove(pos.r + dr, pos.c + dc);
        };

        // ✅ capture로 먼저 먹고, passive:false로 preventDefault 확실히
        window.addEventListener("keydown", onKey, { capture: true, passive: false });
        return () => window.removeEventListener("keydown", onKey, { capture: true });
    }, [pos, tryMove, disabled, submitting]);

    // 드래그/터치 1칸씩 이동
    const dragRef = useRef({ down: false, last: startPos });
    const gridRef = useRef(null);

    const pointToCell = useCallback(
        (clientX, clientY) => {
            const el = gridRef.current;
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

            const cw = rect.width / cols;
            const ch = rect.height / rows;
            return { c: Math.floor(x / cw), r: Math.floor(y / ch) };
        },
        [rows, cols]
    );

    const stepToward = useCallback(
        async (from, to) => {
            if (!to) return from;
            const dr = to.r - from.r;
            const dc = to.c - from.c;

            let nr = from.r;
            let nc = from.c;

            if (Math.abs(dr) >= Math.abs(dc)) nr += dr === 0 ? 0 : dr > 0 ? 1 : -1;
            else nc += dc === 0 ? 0 : dc > 0 ? 1 : -1;

            if (nr === from.r && nc === from.c) return from;

            if (canMoveTo(nr, nc)) {
                await tryMove(nr, nc);
                return { r: nr, c: nc };
            }
            return from;
        },
        [canMoveTo, tryMove]
    );

    const onPointerDown = useCallback(
        (e) => {
            if (disabled || submitting) return;
            rootRef.current?.focus?.(); // ✅ 클릭하면 포커스 잡기
            dragRef.current.down = true;
            dragRef.current.last = { ...pos };
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        [pos, disabled, submitting]
    );

    const onPointerMove = useCallback(
        async (e) => {
            if (!dragRef.current.down) return;
            if (disabled || submitting) return;

            const to = pointToCell(e.clientX, e.clientY);
            const next = await stepToward(dragRef.current.last, to);
            dragRef.current.last = next;
        },
        [pointToCell, stepToward, disabled, submitting]
    );

    const onPointerUp = useCallback(() => {
        dragRef.current.down = false;
    }, []);

    const playerStyle = useMemo(() => {
        const x = ((pos.c + 0.5) / cols) * 100;
        const y = ((pos.r + 0.5) / rows) * 100;
        return { left: `${x}%`, top: `${y}%` };
    }, [pos, cols, rows]);

    return (
        <div className="stagePlay" ref={rootRef} tabIndex={0}>
            <div className="stageQuestion">{question.content || "원을 움직여 O 또는 X 구역까지 도착해."}</div>

            <div className="mazeWrap">
                <div className="mazeTop">
                    <div className="mazeInfo">드래그/터치 또는 WASD/방향키</div>
                    <div className="mazeInfo">{submitting ? "제출 중…" : "O/X에 닿으면 자동 제출"}</div>
                </div>

                <div
                    ref={gridRef}
                    className="mazeGrid"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {Array.from({ length: rows * cols }).map((_, i) => {
                        const r = Math.floor(i / cols);
                        const c = i % cols;
                        const ch = cellAt(r, c);

                        const isWall = ch === "1";
                        const isO = ch === "O";
                        const isX = ch === "X";
                        const isS = ch === "S";

                        return (
                            <div
                                key={i}
                                className={cls("mazeCell", isWall && "wall", isO && "zoneO", isX && "zoneX")}
                            >
                                {(isO || isX || isS) && (
                                    <span className="mazeToken">{isS ? "S" : ch}</span>
                                )}
                            </div>
                        );
                    })}

                    <div className="mazePlayerDot" style={playerStyle} aria-hidden="true" />
                </div>

                <div className="mazePad">
                    <button type="button" className="mazePadBtn" onClick={() => tryMove(pos.r - 1, pos.c)} disabled={disabled || submitting}>▲</button>
                    <div className="mazePadRow">
                        <button type="button" className="mazePadBtn" onClick={() => tryMove(pos.r, pos.c - 1)} disabled={disabled || submitting}>◀</button>
                        <button type="button" className="mazePadBtn" onClick={() => setPos(startPos)} disabled={disabled || submitting}>⟳</button>
                        <button type="button" className="mazePadBtn" onClick={() => tryMove(pos.r, pos.c + 1)} disabled={disabled || submitting}>▶</button>
                    </div>
                    <button type="button" className="mazePadBtn" onClick={() => tryMove(pos.r + 1, pos.c)} disabled={disabled || submitting}>▼</button>
                </div>
            </div>

            <div className="stageHint">현재: ({pos.r + 1},{pos.c + 1})</div>
        </div>
    );
}




/* =========================
 *  5) rps_tradeoff
 * ========================= */
function RpsTradeoffProblem({ question, disabled, submitAnswer, onResolved }) {
    const opts = Array.isArray(question.options) ? question.options : [];
    const [submitting, setSubmitting] = useState(false);

    const mapped = useMemo(() => {
        const a = String(opts[0] ?? "안전하게 롤백");
        const b = String(opts[1] ?? "빠르게 핫픽스");
        const c = String(opts[2] ?? "근본 리팩터");
        return { rock: b, paper: a, scissors: c };
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
 * ========================= */
function RhythmTriageProblem({ question, disabled, submitAnswer, onResolved }) {
    const lanes = Array.isArray(question.options) ? question.options : [];
    const correctText = String(question.answer ?? "");
    const [started, setStarted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [idx, setIdx] = useState(0);
    const [miss, setMiss] = useState(0);

    const startAtRef = useRef(0);
    const rafRef = useRef(null);
    const [nowMs, setNowMs] = useState(0);

    const pattern = useMemo(() => {
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
                    <span>
            MISS {miss}/{missLimit}
          </span>
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
