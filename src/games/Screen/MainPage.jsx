import { useEffect, useRef, useState } from "react";
import "./MainPage.css";
import { useNavigate } from "react-router-dom";

const ACTIONS = [
    { key: "scan", label: "취약점 점검", groupId: "g1" },
    { key: "restore", label: "기록 복구", groupId: "g2" },
    { key: "block", label: "오류 차단", groupId: "g3" },
];

const ERROR_FRAGMENTS = [
    "E_CONNRESET",
    "SIGPIPE",
    "CRC_MISMATCH",
    "NULL_REF",
    "TIMEOUT",
    "FRAME_DROP",
    "AUTH_DENIED",
    "DB_LOCK",
    "MEM_SPIKE",
    "DESYNC",
    "PACKET_LOSS",
    "CHECKSUM_ERR",
];

const LINES = ["이게 무슨 일이지?", "내가 서버를 복구해야 된다고…", "우선 오류를 확인해보자."];

function cls(...xs) {
    return xs.filter(Boolean).join(" ");
}
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function readProgress() {
    try {
        return JSON.parse(sessionStorage.getItem("gameProgress") || "{}");
    } catch {
        return {};
    }
}

export default function MainPage() {
    const navigate = useNavigate();

    const [phase, setPhase] = useState("boot"); // boot | live
    const [selected, setSelected] = useState(null);
    const [glitch, setGlitch] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [focusFrag, setFocusFrag] = useState(null);

    const [frags, setFrags] = useState([]);
    const idRef = useRef(1);

    const [lineIdx, setLineIdx] = useState(0);
    const [bbBump, setBbBump] = useState(false);

    // ✅ 완료/진행 상태
    const [progress, setProgress] = useState(() => readProgress());

    // ✅ /games로 돌아올 때(또는 새로고침) 상태 재동기화
    useEffect(() => {
        const sync = () => setProgress(readProgress());
        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setPhase("live"), 1350);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (phase !== "live") return;
        const i = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 120 + Math.random() * 180);
        }, 900 + Math.random() * 900);
        return () => clearInterval(i);
    }, [phase]);

    useEffect(() => {
        if (phase !== "live") return;

        const spawn = () => {
            const id = idRef.current++;
            const kind = Math.random() < 0.55 ? "toast" : Math.random() < 0.7 ? "stamp" : "line";
            const x = rand(6, 94);
            const y = kind === "line" ? rand(14, 78) : rand(12, 82);
            const ttl = rand(900, 2400);

            const text = ERROR_FRAGMENTS[Math.floor(Math.random() * ERROR_FRAGMENTS.length)];

            const frag = {
                id,
                kind,
                x,
                y,
                ttl,
                text,
                sub: `#${Math.floor(rand(100, 999))} · ${Math.floor(rand(5, 90))}ms`,
                rotate: rand(-6, 6),
                scale: rand(0.92, 1.06),
                jitter: Math.random() < 0.35,
                danger: Math.random() < 0.42,
            };

            setFrags((prev) => {
                const next = [...prev, frag];
                return next.length > 18 ? next.slice(next.length - 18) : next;
            });

            setTimeout(() => {
                setFrags((prev) => prev.filter((f) => f.id !== id));
            }, ttl);
        };

        const i = setInterval(() => {
            const n = Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1;
            for (let k = 0; k < n; k++) spawn();
        }, 520);

        return () => clearInterval(i);
    }, [phase]);

    function openFromFrag(f) {
        if (lineIdx < LINES.length - 1) return;
        setFocusFrag(f);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setFocusFrag(null);
    }

    function isSolved(groupId) {
        return !!progress?.[groupId]?.done;
    }

    function chooseAction(key) {
        const action = ACTIONS.find((a) => a.key === key);
        if (!action) return;

        // ✅ 해결된 액션이면 막기
        if (isSolved(action.groupId)) return;

        setSelected(key);
        setModalOpen(false);
        navigate(`/games/issue/${action.groupId}`);
    }

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === "Escape") closeModal();
        }
        if (modalOpen) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [modalOpen]);

    function advanceDialogueFromClick(e) {
        if (phase !== "live") return;
        if (modalOpen) return;

        const locked = lineIdx < LINES.length - 1;

        if (locked) {
            e.preventDefault();
            e.stopPropagation();

            setLineIdx((i) => Math.min(i + 1, LINES.length - 1));
            setBbBump(true);
            setTimeout(() => setBbBump(false), 220);
            return;
        }

        if (e.target.closest("button, a, input, textarea, .modal, .modalOverlay")) return;

        setLineIdx((i) => Math.min(i + 1, LINES.length - 1));
        setBbBump(true);
        setTimeout(() => setBbBump(false), 220);
    }

    return (
        <div className={cls("page", glitch && "glitch")} onMouseDown={advanceDialogueFromClick}>
            <div className="bgScanlines" />
            <div className="bgNoise" />
            <div className="bgGlowA" />
            <div className="bgGlowB" />

            {phase === "live" && (
                <div className="errorField" aria-hidden="true">
                    {frags.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            className={cls("frag", f.kind, f.jitter && "jit", f.danger && "danger")}
                            onClick={() => openFromFrag(f)}
                            style={{
                                left: `${f.x}vw`,
                                top: `${f.y}vh`,
                                transform: `translate(-50%, -50%) rotate(${f.rotate}deg) scale(${f.scale})`,
                            }}
                        >
                            {f.kind === "line" ? (
                                <div className="fragLine">
                                    <span className="mono">{f.text}</span>
                                    <span className="dim"> · {f.sub}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="fragTop">
                                        <span className="mono">{f.text}</span>
                                        <span className="pill">{f.danger ? "CRIT" : "WARN"}</span>
                                    </div>
                                    <div className="fragSub">{f.sub}</div>
                                </>
                            )}
                            <div className="fragSpark" />
                        </button>
                    ))}
                </div>
            )}

            <div className="hudTop">
                <div className="hudLeft">
                    <div className="chip">CONNECTION</div>
                    <div className="hudValue">{phase === "boot" ? "NEGOTIATING…" : "UNSTABLE"}</div>
                </div>
                <div className="hudRight">
                    <div className="chip danger">SERVER</div>
                    <div className="hudValue dangerText">CRITICAL</div>
                </div>
            </div>

            <div className="card">
                <div className="cardHeader">
                    <h1 className="title" data-text="SECURITY CONSOLE">
                        SECURITY CONSOLE
                    </h1>
                    <p className="subtitle">접속 감지 · 상태 확인 중</p>
                </div>

                {phase === "boot" ? (
                    <div className="boot">
                        <div className="bootRow">
                            <div className="spinner" />
                            <div>
                                <div className="bootTitle">SESSION INIT</div>
                                <div className="bootSub">핵심 모듈 로드…</div>
                            </div>
                        </div>
                        <div className="progressBar">
                            <div className="progressFill" />
                        </div>
                        <div className="bootLogs">
                            <div className="logLine">[OK] kernel hook attached</div>
                            <div className="logLine warn">[WARN] packet jitter detected</div>
                            <div className="logLine err">[ERR] upstream response corrupted</div>
                            <div className="logLine">[OK] fallback channel opened</div>
                        </div>
                    </div>
                ) : (
                    <div className="statusBanner">
                        <div className="statusTitle">
                            <span className="dotPulse" />
                            서버 상태: <b>매우 위험</b>
                        </div>
                        <div className="statusSub">지직거림 감지 · 데이터 무결성 저하</div>
                        <div className="statusMeter">
                            <div className="meterFill" />
                        </div>
                    </div>
                )}
            </div>

            {phase === "live" && (
                <div className={cls("bottomBubble", bbBump && "bump")} role="status" aria-live="polite" data-step={`${lineIdx + 1}/${LINES.length}`}>
                    <div className="bbAvatar">YOU</div>
                    <div className="bbTextWrap">
                        <div className="bbText" key={lineIdx}>
                            {LINES[lineIdx]}
                        </div>
                        <div className="bbStep">
                            {lineIdx + 1} / {LINES.length}
                        </div>
                    </div>
                    <div className="bbFlash" aria-hidden="true" />
                </div>
            )}

            {modalOpen && (
                <div className="modalOverlay" onMouseDown={closeModal}>
                    <div className="modal compact" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="modalHead">
                            <div className="modalTitleRow">
                                <div className="warnTitle">⚠ 제출 서버 불안정</div>
                                <button className="modalClose" onClick={closeModal} aria-label="close" type="button">
                                    ×
                                </button>
                            </div>
                            <div className="modalDesc">{focusFrag ? `${focusFrag.text} · ${focusFrag.sub}` : "signal unstable"}</div>
                        </div>

                        <div className="modalBody">
                            <div className="modalActions3">
                                {ACTIONS.map((a) => {
                                    const done = isSolved(a.groupId);
                                    return (
                                        <button
                                            key={a.key}
                                            type="button"
                                            className={cls("actionPrimary", selected === a.key && "active", done && "disabled")}
                                            onClick={() => chooseAction(a.key)}
                                            disabled={done}
                                            aria-disabled={done}
                                            title={done ? "해결됨" : ""}
                                        >
                                            <span>{a.label}</span>
                                            {done && <span className="actionDone">해결</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
