import React, { useEffect, useMemo, useState } from "react";

const CONFIG = {
  id: "459",
  text: "Kling 3.0 Exclusive Early Unlimited Access & 2-YEAR UNLIMITED Nano Banana Pro. 85% OFF",
  btn: "立即体验",
  link: "https://www.shakker.ai/aigenerator",
  bg: ["#c7ff14 0%", "#baf200 100%"],
  btColor: "#cfff21",
  textStyle: {
    color: "#050505"
  },
  btStyle: {
    border: "1px solid rgba(188, 255, 0, 0.55)",
    background: "#0f1b15",
    color: "#cfff21"
  },
  cycleConfig: {
    showHour: 2,
    hideSecond: 3600,
    isInfinite: true,
    cycleNum: null
  },
  countdownConfig: {
    showCountdown: true,
    countdownPosition: "top-right",
    countdownStyle: {
      color: "#FFFFFF",
      fontSize: "12px",
      fontWeight: "500"
    },
    showHideCountdown: true
  },
  closeBehavior: "keepCycle",
  audienceConfig: {
    enabled: true,
    includeLevelIds: [2, 3, 89, 111, 112, 113],
    excludeLevelIds: [10, 11, 15, 16, 88, 90]
  },
  storageKey: "pop_459_cycle_state"
};

const PHASE = {
  SHOW: "SHOW",
  HIDE: "HIDE",
  STOPPED: "STOPPED",
  PAUSED: "PAUSED"
};

const DISPLAY_STRATEGY = {
  INTERVAL: "interval",
  ONCE: "once"
};

const showDurationMs = Math.max(0, Number(CONFIG.cycleConfig?.showHour || 0) * 3600 * 1000);
const hideDurationMs = Math.max(0, Number(CONFIG.cycleConfig?.hideSecond || 0) * 1000);
const editorStorageKey = `${CONFIG.storageKey}_editor`;

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_e) {
    // ignore storage errors to avoid runtime crash in restricted environments
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_e) {
    // ignore storage errors to avoid runtime crash in restricted environments
  }
}

function createInitialState(now = Date.now()) {
  return {
    phase: PHASE.SHOW,
    phaseStartAt: now,
    cyclesCompleted: 0,
    pausedByClose: false,
    lastPolicyShowAt: null,
    policyWindowKey: null
  };
}

function createDefaultEditorState(now = Date.now()) {
  return {
    text: CONFIG.text || "",
    startAt: now,
    endAt: now + 2 * 3600 * 1000,
    currentLevelId: 2,
    btnText: CONFIG.btn || "",
    btnTextColor: CONFIG.btColor || "",
    btnBackground: CONFIG.btStyle?.backgroundImage || CONFIG.btStyle?.background || "",
    btnBorderColor: "",
    btnRadius: CONFIG.btStyle?.borderRadius || "",
    memberLevelIds: [2, 3, 89, 111, 112, 113],
    memberDisplayStrategyMode: DISPLAY_STRATEGY.ONCE,
    memberDisplayIntervalHour: 24,
    freeDisplayStrategyMode: DISPLAY_STRATEGY.INTERVAL,
    freeDisplayIntervalHour: 2,
    audienceEnabled: Boolean(CONFIG.audienceConfig?.enabled),
    includeLevelIds: Array.isArray(CONFIG.audienceConfig?.includeLevelIds) ? CONFIG.audienceConfig.includeLevelIds.slice() : [],
    excludeLevelIds: Array.isArray(CONFIG.audienceConfig?.excludeLevelIds) ? CONFIG.audienceConfig.excludeLevelIds.slice() : []
  };
}

function readState() {
  try {
    const raw = safeStorageGet(CONFIG.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const phase = parsed.phase;
    const validPhase = Object.values(PHASE).includes(phase);
    if (!validPhase) return null;
    return {
      phase,
      phaseStartAt: Number(parsed.phaseStartAt) || Date.now(),
      cyclesCompleted: Number(parsed.cyclesCompleted) || 0,
      pausedByClose: Boolean(parsed.pausedByClose),
      lastPolicyShowAt: Number(parsed.lastPolicyShowAt) || null,
      policyWindowKey: parsed.policyWindowKey ? String(parsed.policyWindowKey) : null
    };
  } catch (_e) {
    return null;
  }
}

function parseIdList(raw) {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(raw.map((item) => Number(item)).filter((num) => Number.isInteger(num) && num >= 0))
    );
  }
  if (!raw) return [];
  const items = String(raw)
    .split(/[,，\s]+/)
    .map((item) => Number(item))
    .filter((num) => Number.isInteger(num) && num >= 0);
  return Array.from(new Set(items));
}

function parseOptionalId(raw) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return null;
  return num;
}

function readEditorState() {
  const defaults = createDefaultEditorState();
  try {
    const raw = safeStorageGet(editorStorageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    const text = String(parsed.text || CONFIG.text || "");
    const startAt = Number(parsed.startAt) || defaults.startAt;
    const endAt = Number(parsed.endAt) || defaults.endAt;
    const parsedMemberMode = parsed.memberDisplayStrategyMode === DISPLAY_STRATEGY.INTERVAL
      ? DISPLAY_STRATEGY.INTERVAL
      : DISPLAY_STRATEGY.ONCE;
    const parsedMemberInterval = Number(parsed.memberDisplayIntervalHour);
    const parsedFreeMode = parsed.freeDisplayStrategyMode === DISPLAY_STRATEGY.ONCE
      ? DISPLAY_STRATEGY.ONCE
      : DISPLAY_STRATEGY.INTERVAL;
    const parsedFreeInterval = Number(parsed.freeDisplayIntervalHour);
    const legacyMode = parsed.displayStrategyMode === DISPLAY_STRATEGY.ONCE
      ? DISPLAY_STRATEGY.ONCE
      : DISPLAY_STRATEGY.INTERVAL;
    const legacyInterval = Number(parsed.displayIntervalHour);
    return {
      text,
      startAt,
      endAt: endAt > startAt ? endAt : startAt + 3600 * 1000,
      currentLevelId: parseOptionalId(parsed.currentLevelId),
      btnText: String(parsed.btnText || CONFIG.btn || ""),
      btnTextColor: String(parsed.btnTextColor || CONFIG.btColor || ""),
      btnBackground: String(parsed.btnBackground || CONFIG.btStyle?.backgroundImage || CONFIG.btStyle?.background || ""),
      btnBorderColor: String(parsed.btnBorderColor || ""),
      btnRadius: String(parsed.btnRadius || CONFIG.btStyle?.borderRadius || ""),
      memberLevelIds: parseIdList(parsed.memberLevelIds || defaults.memberLevelIds),
      memberDisplayStrategyMode: parsed.memberDisplayStrategyMode
        ? parsedMemberMode
        : (legacyMode === DISPLAY_STRATEGY.ONCE ? DISPLAY_STRATEGY.ONCE : defaults.memberDisplayStrategyMode),
      memberDisplayIntervalHour: Number.isFinite(parsedMemberInterval) && parsedMemberInterval > 0
        ? parsedMemberInterval
        : (Number.isFinite(legacyInterval) && legacyInterval > 0 ? legacyInterval : defaults.memberDisplayIntervalHour),
      freeDisplayStrategyMode: parsed.freeDisplayStrategyMode ? parsedFreeMode : legacyMode,
      freeDisplayIntervalHour: Number.isFinite(parsedFreeInterval) && parsedFreeInterval > 0
        ? parsedFreeInterval
        : (Number.isFinite(legacyInterval) && legacyInterval > 0 ? legacyInterval : defaults.freeDisplayIntervalHour),
      audienceEnabled: parsed.audienceEnabled == null ? Boolean(CONFIG.audienceConfig?.enabled) : Boolean(parsed.audienceEnabled),
      includeLevelIds: parseIdList(parsed.includeLevelIds),
      excludeLevelIds: parseIdList(parsed.excludeLevelIds)
    };
  } catch (_e) {
    return defaults;
  }
}

function toDatetimeLocalValue(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

function parseDatetimeLocal(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(/\//g, "-").replace(" ", "T");
  const time = new Date(normalized).getTime();
  if (Number.isNaN(time)) return null;
  return time;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d}天${h}小时${m}分${s}秒`;
}

function getWindowStatus(editorState, now) {
  if (now < editorState.startAt) {
    return {
      status: "PRE_START",
      remainingMs: editorState.startAt - now
    };
  }
  if (now >= editorState.endAt) {
    return {
      status: "ENDED",
      remainingMs: 0
    };
  }
  return {
    status: "ACTIVE",
    remainingMs: editorState.endAt - now
  };
}

function formatWindowCountdown(windowStatus) {
  if (windowStatus.status === "PRE_START") {
    return `距离开始 ${formatDuration(windowStatus.remainingMs)}`;
  }
  if (windowStatus.status === "ACTIVE") {
    return `距结束 ${formatDuration(windowStatus.remainingMs)}`;
  }
  return "已结束";
}

function getWindowKey(editorState) {
  return `${editorState.startAt}-${editorState.endAt}`;
}

function getUserGroup(editorState) {
  if (editorState.currentLevelId == null) return "free";
  return editorState.memberLevelIds.includes(editorState.currentLevelId) ? "member" : "free";
}

function getDisplayStrategyAccess(editorState, runtimeState) {
  const userGroup = getUserGroup(editorState);
  const isMember = userGroup === "member";
  const mode = isMember
    ? (editorState.memberDisplayStrategyMode || DISPLAY_STRATEGY.ONCE)
    : (editorState.freeDisplayStrategyMode || DISPLAY_STRATEGY.INTERVAL);
  const intervalHour = isMember
    ? Number(editorState.memberDisplayIntervalHour || 0)
    : Number(editorState.freeDisplayIntervalHour || 0);
  const groupLabel = isMember ? "会员用户" : "免费用户";

  if (runtimeState.phase !== PHASE.SHOW) {
    return { allowed: true, reason: `${groupLabel}：非展示阶段`, group: userGroup };
  }

  // This SHOW phase has already passed strategy gating.
  if (runtimeState.lastPolicyShowAt === runtimeState.phaseStartAt) {
    return { allowed: true, reason: `${groupLabel}：本轮展示已准入`, group: userGroup };
  }

  if (mode === DISPLAY_STRATEGY.ONCE) {
    const windowKey = getWindowKey(editorState);
    const shownInCurrentWindow = runtimeState.policyWindowKey === windowKey && Boolean(runtimeState.lastPolicyShowAt);
    if (shownInCurrentWindow) {
      return { allowed: false, reason: `${groupLabel}：活动期间仅展示一次（已展示）`, group: userGroup };
    }
    return { allowed: true, reason: `${groupLabel}：活动期间仅展示一次（首展示）`, group: userGroup };
  }

  const intervalMs = intervalHour > 0 ? intervalHour * 3600 * 1000 : 0;
  if (!runtimeState.lastPolicyShowAt || intervalMs <= 0) {
    return { allowed: true, reason: `${groupLabel}：满足间隔展示策略`, group: userGroup };
  }

  const elapsed = runtimeState.phaseStartAt - runtimeState.lastPolicyShowAt;
  if (elapsed >= intervalMs) {
    return { allowed: true, reason: `${groupLabel}：满足间隔展示策略`, group: userGroup };
  }

  return { allowed: false, reason: `${groupLabel}：间隔未到（剩余${formatDuration(intervalMs - elapsed)}）`, group: userGroup };
}

function getAudienceAccess(editorState) {
  if (!editorState.audienceEnabled) {
    return { allowed: true, reason: "未启用定向" };
  }
  if (editorState.currentLevelId == null) {
    return { allowed: false, reason: "未设置用户等级ID" };
  }
  if (editorState.excludeLevelIds.includes(editorState.currentLevelId)) {
    return { allowed: false, reason: "命中不可见ID" };
  }
  if (editorState.includeLevelIds.length > 0 && !editorState.includeLevelIds.includes(editorState.currentLevelId)) {
    return { allowed: false, reason: "不在可见ID列表" };
  }
  return { allowed: true, reason: "命中可见规则" };
}

function isCycleAvailable() {
  return Boolean(CONFIG.cycleConfig) && showDurationMs > 0;
}

function shouldContinueLoop(nextCyclesCompleted) {
  if (!isCycleAvailable()) return false;
  if (CONFIG.cycleConfig.isInfinite) return true;
  const cycleNum = Number(CONFIG.cycleConfig.cycleNum || 0);
  if (cycleNum <= 0) return false;
  return nextCyclesCompleted < cycleNum;
}

function advanceState(state, now) {
  const next = { ...state };

  if (!isCycleAvailable()) {
    next.phase = PHASE.STOPPED;
    return next;
  }

  if (next.phase === PHASE.PAUSED || next.phase === PHASE.STOPPED) {
    return next;
  }

  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const elapsed = now - next.phaseStartAt;

    if (next.phase === PHASE.SHOW) {
      if (elapsed < showDurationMs) return next;
      next.phase = PHASE.HIDE;
      next.phaseStartAt += showDurationMs;
      continue;
    }

    if (next.phase === PHASE.HIDE) {
      if (elapsed < hideDurationMs) return next;
      const targetStartAt = next.phaseStartAt + hideDurationMs;
      const nextCyclesCompleted = next.cyclesCompleted + 1;
      if (shouldContinueLoop(nextCyclesCompleted)) {
        next.cyclesCompleted = nextCyclesCompleted;
        next.phase = PHASE.SHOW;
        next.phaseStartAt = targetStartAt;
      } else {
        next.cyclesCompleted = nextCyclesCompleted;
        next.phase = PHASE.STOPPED;
        next.phaseStartAt = now;
        return next;
      }
      continue;
    }

    return next;
  }

  return next;
}

export default function App() {
  const [now, setNow] = useState(Date.now());
  const [runtimeState, setRuntimeState] = useState(() => readState() || createInitialState());
  const [editorState, setEditorState] = useState(() => readEditorState());
  const [tip, setTip] = useState({ text: "", type: "" });

  const [form, setForm] = useState(() => {
    const state = readEditorState();
    return {
      text: state.text,
      startInput: toDatetimeLocalValue(state.startAt),
      endInput: toDatetimeLocalValue(state.endAt),
      currentLevelInput: state.currentLevelId == null ? "" : String(state.currentLevelId),
      btnText: state.btnText || "",
      btnTextColor: state.btnTextColor || "",
      btnBackground: state.btnBackground || "",
      btnBorderColor: state.btnBorderColor || "",
      btnRadius: state.btnRadius || "",
      memberLevelIdsInput: state.memberLevelIds.join(","),
      memberDisplayStrategyMode: state.memberDisplayStrategyMode || DISPLAY_STRATEGY.ONCE,
      memberDisplayIntervalHour: String(state.memberDisplayIntervalHour ?? 24),
      freeDisplayStrategyMode: state.freeDisplayStrategyMode || DISPLAY_STRATEGY.INTERVAL,
      freeDisplayIntervalHour: String(state.freeDisplayIntervalHour ?? 2),
      includeIdsInput: state.includeLevelIds.join(","),
      excludeIdsInput: state.excludeLevelIds.join(","),
      audienceEnabled: Boolean(state.audienceEnabled)
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      setRuntimeState((prev) => advanceState(prev, current));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    safeStorageSet(CONFIG.storageKey, JSON.stringify(runtimeState));
  }, [runtimeState]);

  useEffect(() => {
    safeStorageSet(editorStorageKey, JSON.stringify(editorState));
  }, [editorState]);

  const windowStatus = useMemo(() => getWindowStatus(editorState, now), [editorState, now]);
  const audienceAccess = useMemo(() => getAudienceAccess(editorState), [editorState]);
  const displayStrategyAccess = useMemo(
    () => getDisplayStrategyAccess(editorState, runtimeState),
    [editorState, runtimeState]
  );

  const gradient =
    CONFIG.bg && CONFIG.bg.length
      ? `linear-gradient(90deg, ${CONFIG.bg.join(",")})`
      : "linear-gradient(90deg, #4f627f 0%, #27374f 100%)";

  const bannerButtonStyle = useMemo(() => {
    const style = { ...CONFIG.btStyle };
    style.color = editorState.btnTextColor || CONFIG.btColor || "#111";
    if (editorState.btnBackground) {
      if (editorState.btnBackground.includes("gradient(")) {
        style.backgroundImage = editorState.btnBackground;
        style.backgroundColor = "";
      } else {
        style.backgroundImage = "none";
        style.backgroundColor = editorState.btnBackground;
      }
    }
    if (editorState.btnBorderColor) {
      style.borderColor = editorState.btnBorderColor;
    }
    if (editorState.btnRadius) {
      style.borderRadius = editorState.btnRadius;
    }
    return style;
  }, [editorState]);

  const isShowing = runtimeState.phase === PHASE.SHOW;
  const canShowByWindow = windowStatus.status === "ACTIVE";
  const canShowByAudience = audienceAccess.allowed;
  const canShowByDisplayStrategy = displayStrategyAccess.allowed;
  const showBanner = isShowing && canShowByWindow && canShowByAudience && canShowByDisplayStrategy;

  useEffect(() => {
    if (!showBanner) return;
    if (runtimeState.lastPolicyShowAt === runtimeState.phaseStartAt) return;
    const windowKey = getWindowKey(editorState);
    setRuntimeState((prev) => {
      if (prev.lastPolicyShowAt === prev.phaseStartAt) return prev;
      return {
        ...prev,
        lastPolicyShowAt: prev.phaseStartAt,
        policyWindowKey: windowKey
      };
    });
  }, [
    showBanner,
    runtimeState.phaseStartAt,
    runtimeState.lastPolicyShowAt,
    editorState.startAt,
    editorState.endAt
  ]);

  const applyEditorConfig = () => {
    const nextStart = parseDatetimeLocal(form.startInput);
    const nextEnd = parseDatetimeLocal(form.endInput);
    if (!nextStart || !nextEnd) {
      setTip({ text: "开始时间和结束时间都需要设置。", type: "error" });
      return;
    }
    if (nextEnd <= nextStart) {
      setTip({ text: "结束时间必须晚于开始时间。", type: "error" });
      return;
    }

    const nextMemberMode = form.memberDisplayStrategyMode === DISPLAY_STRATEGY.INTERVAL
      ? DISPLAY_STRATEGY.INTERVAL
      : DISPLAY_STRATEGY.ONCE;
    const nextFreeMode = form.freeDisplayStrategyMode === DISPLAY_STRATEGY.ONCE
      ? DISPLAY_STRATEGY.ONCE
      : DISPLAY_STRATEGY.INTERVAL;
    const nextMemberInterval = Number(form.memberDisplayIntervalHour || 0);
    const nextFreeInterval = Number(form.freeDisplayIntervalHour || 0);
    if (nextMemberMode === DISPLAY_STRATEGY.INTERVAL && (!Number.isFinite(nextMemberInterval) || nextMemberInterval <= 0)) {
      setTip({ text: "会员按间隔展示时，间隔小时必须大于 0。", type: "error" });
      return;
    }
    if (nextFreeMode === DISPLAY_STRATEGY.INTERVAL && (!Number.isFinite(nextFreeInterval) || nextFreeInterval <= 0)) {
      setTip({ text: "免费用户按间隔展示时，间隔小时必须大于 0。", type: "error" });
      return;
    }

    const next = {
      text: String(form.text || "").trim() || CONFIG.text,
      startAt: nextStart,
      endAt: nextEnd,
      currentLevelId: parseOptionalId(form.currentLevelInput),
      btnText: String(form.btnText || "").trim() || CONFIG.btn,
      btnTextColor: String(form.btnTextColor || "").trim() || CONFIG.btColor || "",
      btnBackground:
        String(form.btnBackground || "").trim() ||
        CONFIG.btStyle?.backgroundImage ||
        CONFIG.btStyle?.background ||
        "",
      btnBorderColor: String(form.btnBorderColor || "").trim(),
      btnRadius: String(form.btnRadius || "").trim() || CONFIG.btStyle?.borderRadius || "",
      memberLevelIds: parseIdList(form.memberLevelIdsInput),
      memberDisplayStrategyMode: nextMemberMode,
      memberDisplayIntervalHour: nextMemberMode === DISPLAY_STRATEGY.INTERVAL ? nextMemberInterval : editorState.memberDisplayIntervalHour,
      freeDisplayStrategyMode: nextFreeMode,
      freeDisplayIntervalHour: nextFreeMode === DISPLAY_STRATEGY.INTERVAL ? nextFreeInterval : editorState.freeDisplayIntervalHour,
      audienceEnabled: Boolean(form.audienceEnabled),
      includeLevelIds: parseIdList(form.includeIdsInput),
      excludeLevelIds: parseIdList(form.excludeIdsInput)
    };

    setEditorState(next);
    setTip({ text: "配置已应用。", type: "ok" });
  };

  const handleClose = () => {
    const current = Date.now();
    if (CONFIG.closeBehavior === "pauseCycle") {
      setRuntimeState((prev) => ({ ...prev, phase: PHASE.PAUSED, pausedByClose: true, phaseStartAt: current }));
    } else {
      setRuntimeState((prev) => ({ ...prev, phase: PHASE.HIDE, phaseStartAt: current }));
    }
  };

  const resumeCycle = () => {
    const current = Date.now();
    setRuntimeState((prev) => ({ ...prev, phase: PHASE.SHOW, pausedByClose: false, phaseStartAt: current }));
  };

  const resetCycle = () => {
    setRuntimeState(createInitialState());
  };

  const clearLocalStorage = () => {
    safeStorageRemove(CONFIG.storageKey);
    safeStorageRemove(editorStorageKey);
    const defaults = createDefaultEditorState();
    setEditorState(defaults);
    setForm({
      text: defaults.text,
      startInput: toDatetimeLocalValue(defaults.startAt),
      endInput: toDatetimeLocalValue(defaults.endAt),
      currentLevelInput: defaults.currentLevelId == null ? "" : String(defaults.currentLevelId),
      btnText: defaults.btnText,
      btnTextColor: defaults.btnTextColor,
      btnBackground: defaults.btnBackground,
      btnBorderColor: defaults.btnBorderColor,
      btnRadius: defaults.btnRadius,
      memberLevelIdsInput: defaults.memberLevelIds.join(","),
      memberDisplayStrategyMode: defaults.memberDisplayStrategyMode,
      memberDisplayIntervalHour: String(defaults.memberDisplayIntervalHour),
      freeDisplayStrategyMode: defaults.freeDisplayStrategyMode,
      freeDisplayIntervalHour: String(defaults.freeDisplayIntervalHour),
      includeIdsInput: defaults.includeLevelIds.join(","),
      excludeIdsInput: defaults.excludeLevelIds.join(","),
      audienceEnabled: defaults.audienceEnabled
    });
    setRuntimeState(createInitialState());
    setTip({ text: "", type: "" });
  };

  return (
    <>
      <div className="banner" style={{ display: showBanner ? "flex" : "none", background: gradient }} role="region" aria-label="Top promotion banner">
        <div className="banner-content">
          {CONFIG.countdownConfig?.showCountdown && (
            <div className={`countdown ${CONFIG.countdownConfig?.countdownPosition || "top-right"}`} style={CONFIG.countdownConfig?.countdownStyle || {}}>
              {`⏳ 剩余 ${formatDuration(windowStatus.remainingMs)}`}
            </div>
          )}
          <span className="banner-text" style={CONFIG.textStyle}>{editorState.text || CONFIG.text || ""}</span>
          <button className="banner-btn" type="button" style={bannerButtonStyle} onClick={() => window.open(CONFIG.link, "_blank", "noopener,noreferrer")}>
            {editorState.btnText || CONFIG.btn || "立即体验"}
          </button>
        </div>
        <button className="banner-close" type="button" aria-label="Close" onClick={handleClose}>×</button>
      </div>

      <div className="next-countdown" style={{ display: CONFIG.countdownConfig?.showHideCountdown && windowStatus.status !== "ACTIVE" ? "block" : "none" }}>
        {windowStatus.status === "PRE_START" ? `距离开始 ${formatDuration(windowStatus.remainingMs)}` : "已结束"}
      </div>

      <main className="page">
        <section className="panel">
          <h1 className="title">前端吊顶倒计时 Demo（React）</h1>
          <p className="desc">完整实现：展示/隐藏循环、双场景倒计时、手动关闭行为、本地状态恢复、会员等级定向、按钮可视化配置。</p>

          <div className="status-grid">
            <div className="stat">当前阶段：<strong>{`${runtimeState.phase} (${windowStatus.status})`}</strong></div>
            <div className="stat">已完成循环：<strong>{runtimeState.cyclesCompleted}</strong></div>
            <div className="stat">当前用户等级ID：<strong>{editorState.currentLevelId == null ? "未设置" : editorState.currentLevelId}</strong></div>
            <div className="stat">当前用户分组：<strong>{displayStrategyAccess.group === "member" ? "会员用户" : "免费用户"}</strong></div>
            <div className="stat">可见性结果：<strong>{`${audienceAccess.allowed ? "可见" : "不可见"}（${audienceAccess.reason}）`}</strong></div>
            <div className="stat">会员策略：<strong>{editorState.memberDisplayStrategyMode === DISPLAY_STRATEGY.ONCE ? "活动期间仅展示一次" : `每 ${editorState.memberDisplayIntervalHour} 小时展示一次`}</strong></div>
            <div className="stat">免费策略：<strong>{editorState.freeDisplayStrategyMode === DISPLAY_STRATEGY.ONCE ? "活动期间仅展示一次" : `每 ${editorState.freeDisplayIntervalHour} 小时展示一次`}</strong></div>
            <div className="stat">策略状态：<strong>{displayStrategyAccess.reason}</strong></div>
            <div className="stat">状态存储键：<code>{CONFIG.storageKey}</code></div>
            <div className="stat">活动倒计时：<strong>{formatWindowCountdown(windowStatus)}</strong></div>
          </div>

          <div className="editor">
            <div className="editor-grid">
              <div className="editor-field">
                <label htmlFor="bannerTextInput">Banner 文案</label>
                <input id="bannerTextInput" type="text" value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="startInput">开始时间</label>
                <input id="startInput" type="datetime-local" value={form.startInput} onChange={(e) => setForm((p) => ({ ...p, startInput: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="endInput">结束时间</label>
                <input id="endInput" type="datetime-local" value={form.endInput} min={form.startInput} onChange={(e) => setForm((p) => ({ ...p, endInput: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="currentLevelInput">当前用户等级ID</label>
                <input id="currentLevelInput" type="number" min="0" step="1" placeholder="例如 2 / 3 / 89 / 111" value={form.currentLevelInput} onChange={(e) => setForm((p) => ({ ...p, currentLevelInput: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="btnTextInput">右侧按钮文案</label>
                <input id="btnTextInput" type="text" value={form.btnText} onChange={(e) => setForm((p) => ({ ...p, btnText: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="btnTextColorInput">按钮文字颜色</label>
                <input id="btnTextColorInput" type="text" value={form.btnTextColor} onChange={(e) => setForm((p) => ({ ...p, btnTextColor: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="btnBgInput">按钮背景</label>
                <input id="btnBgInput" type="text" value={form.btnBackground} onChange={(e) => setForm((p) => ({ ...p, btnBackground: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="btnBorderColorInput">按钮边框颜色</label>
                <input id="btnBorderColorInput" type="text" value={form.btnBorderColor} onChange={(e) => setForm((p) => ({ ...p, btnBorderColor: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="btnRadiusInput">按钮圆角</label>
                <input id="btnRadiusInput" type="text" value={form.btnRadius} onChange={(e) => setForm((p) => ({ ...p, btnRadius: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="includeIdsInput">可见等级ID（逗号分隔）</label>
                <textarea id="includeIdsInput" value={form.includeIdsInput} onChange={(e) => setForm((p) => ({ ...p, includeIdsInput: e.target.value }))} />
              </div>
              <div className="editor-field">
                <label htmlFor="excludeIdsInput">不可见等级ID（逗号分隔）</label>
                <textarea id="excludeIdsInput" value={form.excludeIdsInput} onChange={(e) => setForm((p) => ({ ...p, excludeIdsInput: e.target.value }))} />
              </div>
              <div className="editor-field checkbox">
                <label htmlFor="audienceEnabledInput">
                  <input id="audienceEnabledInput" type="checkbox" checked={form.audienceEnabled} onChange={(e) => setForm((p) => ({ ...p, audienceEnabled: e.target.checked }))} />
                  启用会员等级定向
                </label>
              </div>
            </div>

            <div className="strategy-groups">
              <section className="strategy-group member-group">
                <h3 className="group-title">组一：会员用户策略</h3>
                <div className="group-grid">
                  <div className="editor-field">
                    <label htmlFor="memberLevelIdsInput">会员等级ID列表（逗号分隔）</label>
                    <textarea
                      id="memberLevelIdsInput"
                      value={form.memberLevelIdsInput}
                      onChange={(e) => setForm((p) => ({ ...p, memberLevelIdsInput: e.target.value }))}
                    />
                  </div>
                  <div className="editor-field">
                    <label htmlFor="memberDisplayStrategyMode">会员用户展示策略</label>
                    <select
                      id="memberDisplayStrategyMode"
                      value={form.memberDisplayStrategyMode}
                      onChange={(e) => setForm((p) => ({ ...p, memberDisplayStrategyMode: e.target.value }))}
                    >
                      <option value={DISPLAY_STRATEGY.INTERVAL}>活动期每 N 小时展示一次</option>
                      <option value={DISPLAY_STRATEGY.ONCE}>活动期间仅展示一次</option>
                    </select>
                  </div>
                  <div className="editor-field">
                    <label htmlFor="memberDisplayIntervalHour">会员展示间隔小时（N）</label>
                    <input
                      id="memberDisplayIntervalHour"
                      type="number"
                      min="0.1"
                      step="0.1"
                      disabled={form.memberDisplayStrategyMode !== DISPLAY_STRATEGY.INTERVAL}
                      value={form.memberDisplayIntervalHour}
                      onChange={(e) => setForm((p) => ({ ...p, memberDisplayIntervalHour: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="strategy-group free-group">
                <h3 className="group-title">组二：免费用户策略</h3>
                <div className="group-grid">
                  <div className="editor-field">
                    <label htmlFor="freeDisplayStrategyMode">免费用户展示策略</label>
                    <select
                      id="freeDisplayStrategyMode"
                      value={form.freeDisplayStrategyMode}
                      onChange={(e) => setForm((p) => ({ ...p, freeDisplayStrategyMode: e.target.value }))}
                    >
                      <option value={DISPLAY_STRATEGY.INTERVAL}>活动期每 N 小时展示一次</option>
                      <option value={DISPLAY_STRATEGY.ONCE}>活动期间仅展示一次</option>
                    </select>
                  </div>
                  <div className="editor-field">
                    <label htmlFor="freeDisplayIntervalHour">免费展示间隔小时（N）</label>
                    <input
                      id="freeDisplayIntervalHour"
                      type="number"
                      min="0.1"
                      step="0.1"
                      disabled={form.freeDisplayStrategyMode !== DISPLAY_STRATEGY.INTERVAL}
                      value={form.freeDisplayIntervalHour}
                      onChange={(e) => setForm((p) => ({ ...p, freeDisplayIntervalHour: e.target.value }))}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className={`editor-tip${tip.type ? ` ${tip.type}` : ""}`}>{tip.text}</div>

          <div className="actions">
            <button className="primary" type="button" onClick={applyEditorConfig}>应用 Banner 配置</button>
            <button className="primary" type="button" onClick={resumeCycle}>恢复循环</button>
            <button type="button" onClick={resetCycle}>重置循环状态</button>
            <button type="button" onClick={clearLocalStorage}>清空本地存储</button>
          </div>
        </section>
      </main>
    </>
  );
}
