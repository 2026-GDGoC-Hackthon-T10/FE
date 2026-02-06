import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";

const ACTIONS = [
    { key: "scan", label: "취약점 점검", sub: "보안 취약 지점 탐색" },
    { key: "block", label: "오류 차단", sub: "치명 오류 유입 차단" },
    { key: "restore", label: "기록 복구", sub: "손상된 로그 복원" },
];

export default function MainPage() {
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 1300);
        return () => clearTimeout(t);
    }, []);

    const selectedLabel = useMemo(
        () => ACTIONS.find((a) => a.key === selected)?.label ?? "선택 대기",
        [selected]
    );

    return (
        <View style={styles.root}>
            <View style={styles.bgGlowA} />
            <View style={styles.bgGlowB} />

            <View style={styles.card}>
                <Text style={styles.title}>SECURITY CONSOLE</Text>
                <Text style={styles.subtitle}>접속 감지 · 상태 확인 중</Text>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.loadingText}>세션 초기화…</Text>
                        <View style={styles.progressBar}>
                            <View style={styles.progressFill} />
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.alertBox}>
                            <Text style={styles.alertTitle}>서버 상태: 매우 위험</Text>
                            <Text style={styles.alertLine}>⚠ 제출 서버 불안정</Text>
                        </View>

                        <Text style={styles.prompt}>먼저 확인할 항목을 선택하세요.</Text>

                        <View style={styles.actions}>
                            {ACTIONS.map((a) => {
                                const active = selected === a.key;
                                return (
                                    <Pressable
                                        key={a.key}
                                        onPress={() => setSelected(a.key)}
                                        style={({ pressed }) => [
                                            styles.actionBtn,
                                            active && styles.actionBtnActive,
                                            pressed && styles.actionBtnPressed,
                                        ]}
                                    >
                                        <View style={styles.actionLeft}>
                                            <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>
                                                {a.label}
                                            </Text>
                                            <Text style={[styles.actionSub, active && styles.actionSubActive]}>
                                                {a.sub}
                                            </Text>
                                        </View>
                                        <Text style={[styles.chev, active && styles.chevActive]}>›</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerKey}>현재 선택</Text>
                            <Text style={styles.footerValue}>{selectedLabel}</Text>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#070A12",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },

    bgGlowA: {
        position: "absolute",
        width: 420,
        height: 420,
        borderRadius: 999,
        backgroundColor: "rgba(110,231,183,0.10)",
        top: -140,
        left: -120,
    },
    bgGlowB: {
        position: "absolute",
        width: 520,
        height: 520,
        borderRadius: 999,
        backgroundColor: "rgba(99,102,241,0.10)",
        bottom: -220,
        right: -200,
    },

    card: {
        width: "100%",
        maxWidth: 520,
        borderRadius: 18,
        padding: 18,
        backgroundColor: "rgba(12,16,28,0.92)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.18)",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
        elevation: 6,
    },

    title: {
        color: "#E5E7EB",
        fontSize: 18,
        letterSpacing: 1.2,
        fontWeight: "800",
    },
    subtitle: {
        color: "rgba(229,231,235,0.65)",
        marginTop: 6,
        fontSize: 12,
    },

    loadingBox: {
        marginTop: 18,
        padding: 16,
        borderRadius: 14,
        backgroundColor: "rgba(2,6,23,0.75)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.14)",
        alignItems: "center",
        gap: 10,
    },
    loadingText: {
        color: "rgba(229,231,235,0.8)",
        fontSize: 13,
    },
    progressBar: {
        width: "100%",
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: "rgba(148,163,184,0.12)",
    },
    progressFill: {
        width: "62%",
        height: "100%",
        borderRadius: 999,
        backgroundColor: "rgba(110,231,183,0.55)",
    },

    alertBox: {
        marginTop: 16,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "rgba(127,29,29,0.22)",
        borderWidth: 1,
        borderColor: "rgba(248,113,113,0.32)",
    },
    alertTitle: {
        color: "#FCA5A5",
        fontWeight: "800",
        fontSize: 14,
    },
    alertLine: {
        color: "rgba(254,226,226,0.9)",
        marginTop: 6,
        fontSize: 13,
        fontWeight: "700",
    },

    prompt: {
        marginTop: 14,
        color: "rgba(229,231,235,0.75)",
        fontSize: 12,
    },

    actions: {
        marginTop: 10,
        gap: 10,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: "rgba(2,6,23,0.72)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.14)",
    },
    actionBtnActive: {
        borderColor: "rgba(110,231,183,0.45)",
        backgroundColor: "rgba(16,185,129,0.10)",
    },
    actionBtnPressed: {
        transform: [{ scale: 0.99 }],
        opacity: 0.95,
    },

    actionLeft: {
        gap: 4,
    },
    actionLabel: {
        color: "#E5E7EB",
        fontSize: 15,
        fontWeight: "800",
    },
    actionLabelActive: {
        color: "#D1FAE5",
    },
    actionSub: {
        color: "rgba(229,231,235,0.55)",
        fontSize: 12,
        fontWeight: "600",
    },
    actionSubActive: {
        color: "rgba(209,250,229,0.70)",
    },
    chev: {
        color: "rgba(229,231,235,0.45)",
        fontSize: 22,
        fontWeight: "900",
        marginLeft: 10,
    },
    chevActive: {
        color: "rgba(167,243,208,0.85)",
    },

    footer: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(148,163,184,0.12)",
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
    },
    footerKey: {
        color: "rgba(229,231,235,0.55)",
        fontSize: 12,
        fontWeight: "700",
    },
    footerValue: {
        color: "#E5E7EB",
        fontSize: 13,
        fontWeight: "900",
    },
});
