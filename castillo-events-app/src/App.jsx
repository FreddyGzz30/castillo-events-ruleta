import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://yadshscykpobihifysnx.supabase.co";
const SUPABASE_KEY = "sb_publishable_UaFJ4qOiKnIq6qC5IBQg9A_Q-cDhmij";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOGO_URL = "https://raw.githubusercontent.com/FreddyGzz30/castillo-events-ruleta/main/castillo-events-app/logo.jpeg";

const GOLD  = "#c9a84c";
const CREAM = "#f5e6c8";
const DARK  = "#0a0a0a";
const DARK3 = "#1a1a1a";

const DEFAULT_PRIZES = [
  "10% de descuento","30 min gratis","15 fotos extra","15% de descuento",
  "Cabina VIP 1hr","Teléfono retro gratis","","",
];
const LS_KEY = "castillo_prizes";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ── DB ────────────────────────────────────────────────────────────────────────
async function dbCreate(prizes) {
  const id = generateId();
  const { error } = await supabase.from("spin_links").insert({ id, prizes, used: false, result: null });
  if (error) throw error;
  return id;
}
async function dbGet(id) {
  const { data, error } = await supabase.from("spin_links").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}
async function dbGetAll() {
  const { data, error } = await supabase.from("spin_links").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data;
}
async function dbMarkSpun(id, result) {
  await supabase.from("spin_links").update({ used: true, result }).eq("id", id);
}
async function dbDelete(id) {
  await supabase.from("spin_links").delete().eq("id", id);
}
async function dbDeleteAll() {
  await supabase.from("spin_links").delete().neq("id", "___never___");
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function CastilloLogo({ size = 80 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden",
      flexShrink: 0, boxShadow: `0 0 24px ${GOLD}44`, border: `2px solid ${GOLD}`, background: DARK,
    }}>
      <img src={LOGO_URL} alt="Castillo Events"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={e => { e.target.style.display = "none"; }}
      />
    </div>
  );
}

// ── Ruleta ────────────────────────────────────────────────────────────────────
// onSpinEnd(winnerIndex, finalAngleDeg) — el índice ganador se calcula DENTRO
// de la animación para garantizar que coincide con lo dibujado.
function SpinWheel({ prizes, spinning, rotation, onSpinEnd }) {
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const startRotRef   = useRef(0);
  const targetRotRef  = useRef(0);
  const startTimeRef  = useRef(0);
  const DURATION = 5200;

  const activePrizes = prizes.filter(p => p.trim() !== "");
  const count = Math.max(activePrizes.length, 1);
  const sliceDeg = 360 / count;

  // Dado un ángulo de rotación (grados), calcula qué índice queda bajo la flecha (arriba).
  // La flecha apunta a 270° en coordenadas absolutas (arriba del canvas).
  // El segmento i ocupa el arco [i*sliceDeg, (i+1)*sliceDeg) en coordenadas de la ruleta.
  // Cuando la ruleta rota `angleDeg`, el punto de la ruleta que queda arriba es (-angleDeg % 360 + 360) % 360.
  function calcWinner(angleDeg) {
    const slotUnderArrow = (((-angleDeg) % 360) + 360) % 360;
    return Math.floor(slotUnderArrow / sliceDeg) % count;
  }

  const draw = useCallback((angleDeg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 6;
    ctx.clearRect(0, 0, W, H);
    const angle = (angleDeg * Math.PI) / 180;
    const slice = (2 * Math.PI) / count;

    // Fondo con glow
    ctx.save();
    ctx.shadowColor = GOLD; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#111"; ctx.fill();
    ctx.restore();

    for (let i = 0; i < count; i++) {
      const sa = angle + i * slice - Math.PI / 2;
      const ea = sa + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 2, sa, ea); ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#1c1500" : "#271c00"; ctx.fill();
      ctx.strokeStyle = GOLD + "77"; ctx.lineWidth = 1.5; ctx.stroke();

      // Texto del segmento
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sa + slice / 2);
      ctx.textAlign = "right"; ctx.fillStyle = CREAM;
      const fs = count <= 4 ? 14 : count <= 6 ? 12 : 10;
      ctx.font = `bold ${fs}px 'Cinzel', serif`;
      ctx.shadowColor = GOLD; ctx.shadowBlur = 5;
      let label = activePrizes[i] || "";
      const maxW = r - 32;
      let display = label;
      while (ctx.measureText(display).width > maxW && display.length > 2)
        display = display.slice(0, -1);
      if (display !== label) display = display.slice(0, -1) + "…";
      ctx.fillText(display, r - 12, 5);
      ctx.restore();
    }

    // Centro
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = DARK; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = "bold 16px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✦", cx, cy);

    // Aro exterior
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
  }, [count, activePrizes]);

  useEffect(() => {
    if (!spinning) return;
    const extra = 360 * 7 + Math.random() * 360;
    startRotRef.current = rotation;
    targetRotRef.current = rotation + extra;
    startTimeRef.current = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const p = Math.min((now - startTimeRef.current) / DURATION, 1);
      const cur = startRotRef.current + (targetRotRef.current - startRotRef.current) * easeOut(p);
      draw(cur);
      if (p < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const finalAngle = targetRotRef.current % 360;
        const winnerIndex = calcWinner(finalAngle);
        onSpinEnd(winnerIndex, finalAngle);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning]);

  useEffect(() => { if (!spinning) draw(rotation); }, [rotation, spinning, draw]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
        <div style={{
          width: 0, height: 0,
          borderLeft: "13px solid transparent", borderRight: "13px solid transparent",
          borderTop: `26px solid ${GOLD}`, filter: `drop-shadow(0 0 8px ${GOLD})`,
        }}/>
      </div>
      <canvas ref={canvasRef} width={320} height={320} style={{ borderRadius: "50%", display: "block" }}/>
    </div>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
function AdminView({ onShowSpin }) {
  // Cargar premios desde localStorage, o usar los por defecto
  const [prizes, setPrizes] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PRIZES;
  });
  const [savedMsg, setSavedMsg]     = useState(false);
  const [genLink, setGenLink]       = useState(null);
  const [copied, setCopied]         = useState(false);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingHist, setLoadingHist] = useState(true);
  const [error, setError]           = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const active = prizes.filter(p => p.trim() !== "");
  const update = (i, v) => { const n = [...prizes]; n[i] = v; setPrizes(n); };

  // Guardar premios
  const savePrizes = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(prizes));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  // Restablecer premios por defecto
  const resetPrizes = () => {
    setPrizes(DEFAULT_PRIZES);
    localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_PRIZES));
  };

  useEffect(() => {
    (async () => {
      setLoadingHist(true);
      const data = await dbGetAll();
      setHistory(data);
      setLoadingHist(false);
    })();
  }, []);

  const generate = async () => {
    if (active.length < 2 || loading) return;
    setLoading(true); setError(null);
    try {
      const id = await dbCreate(active);
      const link = `${window.location.origin}${window.location.pathname}?spin=${id}`;
      setGenLink({ id, label: link });
      const data = await dbGetAll();
      setHistory(data);
    } catch {
      setError("Error al generar el link. Verifica tu conexión.");
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard?.writeText(genLink.label);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const deleteOne = async (id) => {
    await dbDelete(id);
    setHistory(h => h.filter(x => x.id !== id));
  };

  const clearAll = async () => {
    await dbDeleteAll();
    setHistory([]);
    setConfirmClear(false);
  };

  const getLinkUrl = (id) => `${window.location.origin}${window.location.pathname}?spin=${id}`;

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: CREAM, fontFamily: "'Cinzel', serif" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 20% 10%, #c9a84c09 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 90%, #c9a84c07 0%, transparent 55%)`,
      }}/>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* Botón recargar */}
        <button onClick={() => window.location.reload()} title="Recargar página" style={{
          position: "fixed", top: 16, right: 16, zIndex: 100,
          width: 40, height: 40, borderRadius: "50%",
          background: DARK3, border: `1px solid ${GOLD}44`,
          color: GOLD, fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 12px ${GOLD}22`, transition: "all .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = `0 0 20px ${GOLD}55`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = GOLD+"44"; e.currentTarget.style.boxShadow = `0 0 12px ${GOLD}22`; }}
        >↻</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36 }}>
          <CastilloLogo size={68}/>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 6, color: GOLD, marginBottom: 3 }}>PANEL DE CONTROL</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: CREAM, lineHeight: 1.1 }}>Castillo Events</h1>
            <div style={{ fontSize: 9, color: GOLD + "88", letterSpacing: 3, marginTop: 2 }}>RULETA DE PREMIOS</div>
          </div>
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, marginBottom: 32 }}/>

        {/* Premios */}
        <div style={{ fontSize: 9, letterSpacing: 5, color: GOLD, marginBottom: 18 }}>CONFIGURA LOS PREMIOS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {prizes.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: GOLD + "77", fontWeight: 700 }}>{i + 1}</span>
              <input value={p} onChange={e => update(i, e.target.value)} placeholder={`Premio ${i + 1} (opcional)`}
                style={{
                  width: "100%", padding: "12px 12px 12px 28px", background: "#141414",
                  border: `1px solid ${p ? GOLD + "55" : "#222"}`, borderRadius: 7, color: CREAM,
                  fontFamily: "'Cinzel', serif", fontSize: 11, outline: "none", boxSizing: "border-box", transition: "border .2s",
                }}
                onFocus={e => e.target.style.borderColor = GOLD}
                onBlur={e => e.target.style.borderColor = p ? GOLD + "55" : "#222"}
              />
            </div>
          ))}
        </div>

        {/* Botones guardar / restablecer */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button onClick={savePrizes} style={{
            flex: 1, padding: "10px",
            background: savedMsg ? "#1a2e00" : "transparent",
            border: `1px solid ${savedMsg ? "#6aaa00" : GOLD + "66"}`,
            borderRadius: 7, color: savedMsg ? "#aaee00" : GOLD,
            fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 3, cursor: "pointer", transition: "all .2s",
          }}>
            {savedMsg ? "✓ GUARDADO" : "GUARDAR PREMIOS"}
          </button>
          <button onClick={resetPrizes} style={{
            padding: "10px 18px", background: "transparent",
            border: "1px solid #ff444433", borderRadius: 7, color: "#ff666677",
            fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 2, cursor: "pointer",
          }}>
            RESTABLECER
          </button>
        </div>

        <div style={{ fontSize: 10, color: active.length < 2 ? "#c9a84c66" : GOLD + "99", textAlign: "center", marginBottom: 28, letterSpacing: 1 }}>
          {active.length < 2 ? "⚠ Agrega al menos 2 premios" : `✦ ${active.length} premios activos`}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD}44,transparent)`, marginBottom: 28 }}/>

        {/* Generar link */}
        <button onClick={generate} disabled={active.length < 2 || loading} style={{
          width: "100%", padding: "17px",
          background: active.length < 2 || loading ? "#141414" : `linear-gradient(135deg,#c9a84c,#9a7020,#c9a84c)`,
          border: `1px solid ${active.length < 2 || loading ? "#222" : GOLD}`,
          borderRadius: 9, color: active.length < 2 || loading ? GOLD + "33" : DARK,
          fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 5, fontWeight: 700,
          cursor: active.length < 2 || loading ? "not-allowed" : "pointer",
          boxShadow: active.length >= 2 && !loading ? `0 0 28px ${GOLD}44` : "none", transition: "all .3s",
        }}>
          {loading ? "GENERANDO…" : "✦ GENERAR LINK ÚNICO"}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 16px", background: "#2a0000", border: "1px solid #ff444444", borderRadius: 7, fontSize: 11, color: "#ff8888" }}>
            {error}
          </div>
        )}

        {genLink && (
          <div style={{ marginTop: 18, padding: 18, background: "#141414", border: `1px solid ${GOLD}55`, borderRadius: 9, animation: "fadeIn .4s ease" }}>
            <div style={{ fontSize: 9, letterSpacing: 5, color: GOLD, marginBottom: 10 }}>LINK GENERADO ✦</div>
            <div style={{ padding: "9px 12px", background: DARK, borderRadius: 5, fontSize: 10, color: CREAM + "bb", wordBreak: "break-all", fontFamily: "monospace", marginBottom: 12, border: `1px solid ${GOLD}22` }}>
              {genLink.label}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copy} style={{ padding: "9px 22px", background: copied ? "#1a2e00" : "transparent", border: `1px solid ${copied ? "#6aaa00" : GOLD}`, borderRadius: 5, color: copied ? "#aaee00" : GOLD, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 3, cursor: "pointer" }}>
                {copied ? "✓ COPIADO" : "COPIAR"}
              </button>
              <button onClick={() => onShowSpin(genLink.id)} style={{ padding: "9px 22px", background: "transparent", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD + "88", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 3, cursor: "pointer" }}>
                VER RULETA →
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: GOLD + "55", letterSpacing: 1 }}>
              ⚠ Link de un solo uso. Una vez girada la ruleta, ya no funcionará.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => onShowSpin("demo")} style={{ background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 7, color: GOLD + "77", padding: "9px 22px", fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: 3, cursor: "pointer" }}>
            VER DEMO DE RULETA →
          </button>
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD}22,transparent)`, margin: "32px 0 24px" }}/>

        {/* Historial */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 5, color: GOLD }}>HISTORIAL DE LINKS</div>
          {history.length > 0 && (
            confirmClear ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={clearAll} style={{ padding: "5px 14px", background: "#3a0000", border: "1px solid #ff444466", borderRadius: 5, color: "#ff8888", fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 2, cursor: "pointer" }}>CONFIRMAR</button>
                <button onClick={() => setConfirmClear(false)} style={{ padding: "5px 14px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 5, color: GOLD + "66", fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 2, cursor: "pointer" }}>CANCELAR</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} style={{ padding: "5px 14px", background: "transparent", border: "1px solid #ff444433", borderRadius: 5, color: "#ff666666", fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 2, cursor: "pointer" }}>BORRAR TODO</button>
            )
          )}
        </div>

        {loadingHist ? (
          <div style={{ textAlign: "center", fontSize: 10, color: GOLD + "55", padding: "20px 0", letterSpacing: 3 }}>CARGANDO…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: "center", fontSize: 10, color: GOLD + "33", padding: "20px 0", letterSpacing: 2 }}>No hay links generados aún</div>
        ) : (
          history.map((h) => {
            const linkUrl = getLinkUrl(h.id);
            return (
              <div key={h.id} style={{ padding: "11px 14px", marginBottom: 8, background: "#141414", borderRadius: 7, border: `1px solid ${GOLD}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: CREAM, marginBottom: 3 }}>
                      {(h.prizes || []).slice(0, 3).join(" · ")}{(h.prizes || []).length > 3 ? " …" : ""}
                    </div>
                    <div style={{ fontSize: 9, color: GOLD + "55", marginBottom: 4 }}>
                      {new Date(h.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {h.used && h.result && <div style={{ fontSize: 9, color: "#66cc66" }}>✓ Ganó: {h.result}</div>}
                    <div style={{ fontSize: 9, color: CREAM + "33", wordBreak: "break-all", fontFamily: "monospace", marginTop: 4 }}>{linkUrl}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    <div style={{ fontSize: 8, padding: "3px 9px", borderRadius: 20, letterSpacing: 2, background: h.used ? "#ff000011" : "#00ff0011", border: `1px solid ${h.used ? "#ff666644" : "#44cc4444"}`, color: h.used ? "#ff8888" : "#66dd66" }}>
                      {h.used ? "USADO" : "ACTIVO"}
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(linkUrl)} style={{ padding: "3px 9px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 5, color: GOLD + "66", fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 1, cursor: "pointer" }}>COPIAR</button>
                    <button onClick={() => deleteOne(h.id)} style={{ padding: "3px 9px", background: "transparent", border: "1px solid #ff444433", borderRadius: 5, color: "#ff666666", fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 1, cursor: "pointer" }}>BORRAR</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ position: "fixed", bottom: 10, right: 14, fontSize: 9, color: GOLD + "33", fontFamily: "'Cinzel', serif", letterSpacing: 2, pointerEvents: "none" }}>by: FGC30</div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        input::placeholder{color:#c9a84c22}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}

// ── Spin View ─────────────────────────────────────────────────────────────────
function SpinView({ spinId, onBack }) {
  const isDemo = spinId === "demo";
  const [phase, setPhase]           = useState("loading");
  const [prizes, setPrizes]         = useState([]);
  const [rotation, setRotation]     = useState(0);
  const [spinning, setSpinning]     = useState(false);
  const [result, setResult]         = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [particles, setParticles]   = useState([]);

  useEffect(() => {
    (async () => {
      if (isDemo) {
        // En demo usamos los premios guardados en localStorage si existen
        try {
          const saved = localStorage.getItem(LS_KEY);
          if (saved) {
            const parsed = JSON.parse(saved).filter(p => p.trim() !== "");
            if (parsed.length >= 2) { setPrizes(parsed); setPhase("ready"); return; }
          }
        } catch {}
        setPrizes(DEFAULT_PRIZES.filter(p => p.trim() !== ""));
        setPhase("ready"); return;
      }
      const data = await dbGet(spinId);
      if (!data) { setPhase("invalid"); return; }
      if (data.used) { setPhase("used"); setResult(data.result); return; }
      setPrizes(data.prizes);
      setPhase("ready");
    })();
  }, [spinId]);

  // onSpinEnd recibe (winnerIndex, finalAngle)
  const handleSpinEnd = async (winnerIndex, finalAngle) => {
    setSpinning(false);
    setRotation(finalAngle);
    const won = prizes[winnerIndex];
    if (!isDemo) await dbMarkSpun(spinId, won);
    setResult(won);
    setPhase("done");
    setParticles(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 30 + Math.random() * 40, y: 20 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 80, dy: 20 + Math.random() * 60,
      color: [GOLD, CREAM, "#fff", "#e8d59a"][i % 4],
    })));
    setTimeout(() => setShowResult(true), 500);
    setTimeout(() => setParticles([]), 3000);
  };

  const bg = {
    minHeight: "100vh", background: DARK, color: CREAM, fontFamily: "'Cinzel', serif",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "28px 16px", position: "relative", overflow: "hidden",
  };

  if (phase === "loading") return (
    <div style={bg}>
      <CastilloLogo size={60}/>
      <div style={{ marginTop: 24, fontSize: 10, letterSpacing: 6, color: GOLD, animation: "pulse 1.5s infinite" }}>CARGANDO…</div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}*{box-sizing:border-box}`}</style>
    </div>
  );

  if (phase === "invalid") return (
    <div style={bg}>
      <CastilloLogo size={72}/>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 13, letterSpacing: 4, color: GOLD, marginBottom: 8 }}>LINK INVÁLIDO</div>
        <div style={{ fontSize: 11, color: CREAM + "88", maxWidth: 260, lineHeight: 1.8 }}>Este link no existe o ha expirado. Contacta a Castillo Events para obtener uno válido.</div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');*{box-sizing:border-box}`}</style>
    </div>
  );

  if (phase === "used") return (
    <div style={bg}>
      <CastilloLogo size={72}/>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 13, letterSpacing: 4, color: GOLD, marginBottom: 8 }}>YA UTILIZADO</div>
        <div style={{ fontSize: 11, color: CREAM + "88", maxWidth: 260, lineHeight: 1.8 }}>Este link ya fue usado. Solo se permite un giro por link.</div>
        {result && (
          <div style={{ marginTop: 20, padding: "14px 28px", background: DARK3, border: `1px solid ${GOLD}66`, borderRadius: 9 }}>
            <div style={{ fontSize: 9, color: GOLD, letterSpacing: 4, marginBottom: 5 }}>RESULTADO REGISTRADO</div>
            <div style={{ fontSize: 15, color: CREAM }}>{result}</div>
          </div>
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');*{box-sizing:border-box}`}</style>
    </div>
  );

  return (
    <div style={bg}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 0%,#c9a84c0e 0%,transparent 55%)` }}/>

      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: `calc(${p.x}% + ${p.dx}px)`, top: `calc(${p.y}% + ${p.dy}px)`,
          width: 7, height: 7, borderRadius: "50%", background: p.color,
          pointerEvents: "none", zIndex: 100, animation: "confetti 2.8s ease-out forwards",
        }}/>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6, zIndex: 1 }}>
        <CastilloLogo size={52}/>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: CREAM }}>Castillo Events</div>
          <div style={{ fontSize: 8, letterSpacing: 4, color: GOLD }}>RULETA DE PREMIOS</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: CREAM + "55", marginBottom: 24, letterSpacing: 2, zIndex: 1 }}>
        {phase === "ready" && (isDemo ? "MODO DEMO — Solo previsualización" : "¡Gira y descubre tu premio!")}
        {phase === "spinning" && "Girando…"}
        {phase === "done" && "¡Felicidades! 🎉"}
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 24 }}>
        <SpinWheel prizes={prizes} spinning={spinning} rotation={rotation} onSpinEnd={handleSpinEnd}/>
      </div>

      {phase === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 1 }}>
          <button onClick={() => { setSpinning(true); setPhase("spinning"); }} style={{
            padding: "16px 52px", background: `linear-gradient(135deg,#c9a84c,#9a7020,#c9a84c)`,
            border: "none", borderRadius: 50, color: DARK, fontFamily: "'Cinzel',serif",
            fontSize: 12, letterSpacing: 5, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 0 32px ${GOLD}55`, animation: "glowPulse 2s infinite",
          }}
            onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >✦ GIRAR</button>
          {isDemo && (
            <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 6, color: GOLD + "66", padding: "8px 20px", fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: 3, cursor: "pointer" }}>← VOLVER AL PANEL</button>
          )}
        </div>
      )}

      {phase === "done" && showResult && (
        <div style={{ zIndex: 1, textAlign: "center", animation: "fadeInUp .6s ease" }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: GOLD, marginBottom: 14 }}>✦ TU PREMIO ✦</div>
          <div style={{ padding: "22px 36px", background: DARK3, border: `1px solid ${GOLD}`, borderRadius: 12, boxShadow: `0 0 40px ${GOLD}44`, marginBottom: 18 }}>
            <div style={{ fontSize: 20, color: CREAM, fontWeight: 700, letterSpacing: 2 }}>{result}</div>
          </div>
          <div style={{ fontSize: 10, color: CREAM + "66", maxWidth: 260, lineHeight: 1.8, letterSpacing: 1 }}>
            Toma una captura de pantalla y envíasela a Castillo Events para reclamar tu premio. 📸
          </div>
          {isDemo && (
            <>
              <div style={{ marginTop: 10, fontSize: 9, color: GOLD + "55", letterSpacing: 2 }}>MODO DEMO — No se guardó</div>
              <button onClick={onBack} style={{ marginTop: 16, background: "transparent", border: `1px solid ${GOLD}44`, borderRadius: 6, color: GOLD + "77", padding: "8px 20px", fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: 3, cursor: "pointer" }}>← VOLVER AL PANEL</button>
            </>
          )}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 10, right: 14, fontSize: 9, color: GOLD + "33", fontFamily: "'Cinzel', serif", letterSpacing: 2, pointerEvents: "none" }}>by: FGC30</div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap');
        @keyframes fadeInUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 32px ${GOLD}55}50%{box-shadow:0 0 52px ${GOLD}99}}
        @keyframes confetti{0%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:0;transform:scale(0) rotate(180deg) translateY(40px)}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]     = useState("admin");
  const [spinId, setSpinId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("spin");
    if (id) { setSpinId(id); setView("spin"); }
  }, []);

  return view === "admin"
    ? <AdminView onShowSpin={id => { setSpinId(id); setView("spin"); }}/>
    : <SpinView spinId={spinId} onBack={() => { setView("admin"); setSpinId(null); }}/>;
}
