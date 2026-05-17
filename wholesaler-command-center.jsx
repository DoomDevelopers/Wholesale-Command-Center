import { useState, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STAGES = ["Marketing", "Lead In", "Under Contract", "Buyer Found", "Closed"];

const STRATEGY_COLORS = {
  "Assignment": "#f5a623", "Wholetailing": "#00d084",
  "Novation Agreement": "#4d9fff", "Subject-To": "#c84bff", "Co-Wholesaling": "#ff4d9f",
};
const STRATEGY_ICONS = {
  "Assignment": "📋", "Wholetailing": "🏡",
  "Novation Agreement": "🤝", "Subject-To": "🔑", "Co-Wholesaling": "👥",
};

const LEAD_PROMPT = `You are an expert real estate wholesaling lead analyst. Analyze the lead and respond ONLY in this exact JSON (no markdown):
{"score":0,"score_label":"","motivation_reasons":[],"watch_outs":[],"script":{"opener":"","value_prop":"","qualifying_questions":[],"objection_handler":"","close":""}}
Score 1-10. score_label: Hot/Warm/Cold. 8-10=tax delinquent/pre-foreclosure/vacant/inherited. 5-7=absentee/high equity. 1-4=owner-occupied/low equity. Tailor script to situation. Never mention "wholesaling" to seller.`;

const EXIT_PROMPT = `You are an expert real estate wholesaling strategist. Respond ONLY in this exact JSON (no markdown):
{"ranked_exits":[{"strategy":"","fit_score":0,"why_it_fits":"","how_to_execute":[],"watch_out":""}],"dead_ends":[],"best_first_move":""}
Rank ALL 5: Assignment, Wholetailing, Novation Agreement, Subject-To, Co-Wholesaling. Move genuinely unsuitable to dead_ends. Assignment: heavily distressed 30%+ repairs. Wholetailing: 70-85% ARV cosmetic. Novation: high equity sellers won't discount. Subject-To: behind on mortgage pre-foreclosure. Co-Wholesaling: always backup.`;

const fmtMoney = (n) => `$${Math.abs(Number(n) || 0).toLocaleString()}`;
const getDaysSince = (d) => d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;
const uid = () => Date.now() + Math.random();

// ─── API CALL ─────────────────────────────────────────────────────────────────

async function callClaude(system, userMsg) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      system, messages: [{ role: "user", content: userMsg }]
    })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", background: "#0a0914", border: "1px solid #1e1a3a",
  borderRadius: 8, padding: "9px 12px", color: "#e8e0ff", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  transition: "border-color 0.2s"
};

function Input({ value, onChange, placeholder, type = "text", prefix }) {
  return (
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a4070", fontSize: 13 }}>{prefix}</span>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft: prefix ? 22 : 12 }}
        onFocus={e => e.target.style.borderColor = "#7c6fff"}
        onBlur={e => e.target.style.borderColor = "#1e1a3a"}
      />
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label style={{ display: "block", color: "#4a4070", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>
      {children}{required && <span style={{ color: "#7c6fff" }}> *</span>}
    </label>
  );
}

function Field({ label, required, children }) {
  return <div style={{ marginBottom: 13 }}><Label required={required}>{label}</Label>{children}</div>;
}

function Btn({ onClick, disabled, children, variant = "primary", small }) {
  const bg = disabled ? "#1a1630" : variant === "primary" ? "linear-gradient(135deg, #7c6fff, #c084fc)" : variant === "danger" ? "#2a0a0a" : "#1a1630";
  const color = disabled ? "#3a3060" : variant === "danger" ? "#ff4d4d" : "#fff";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, border: "none", borderRadius: small ? 6 : 10,
      padding: small ? "5px 10px" : "12px 18px",
      color, fontSize: small ? 12 : 14, fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif", cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 0.2s", letterSpacing: 0.5
    }}>{children}</button>
  );
}

function Card({ children, accent, style: s }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: `1px solid ${accent ? accent + "44" : "#1e1a3a"}`,
      borderRadius: 14, padding: 18, ...s
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: "#4a4070", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14 }}>{children}</div>;
}

// ─── TAB NAV ──────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", background: "#08071a", borderRadius: 12, padding: 4, marginBottom: 22, gap: 3 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "10px 6px", borderRadius: 9, border: "none", cursor: "pointer",
          background: active === t.id ? "linear-gradient(135deg, #7c6fff22, #c084fc22)" : "transparent",
          borderTop: active === t.id ? "1px solid #7c6fff66" : "1px solid transparent",
          color: active === t.id ? "#c084fc" : "#3a3060",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 11,
          letterSpacing: 0.5, transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3
        }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function Overview({ deals, expenses }) {
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    + deals.reduce((s, d) => s + Number(d.marketingSpent || 0), 0);
  const pipeline = deals.filter(d => d.stage < 4).reduce((s, d) => s + Number(d.expectedFee || 0), 0);
  const closed = deals.filter(d => d.stage === 4).reduce((s, d) => s + Number(d.expectedFee || 0), 0);
  const hot = deals.filter(d => d.leadScore >= 8).length;
  const avgDays = deals.length ? Math.round(deals.reduce((s, d) => s + getDaysSince(d.startDate), 0) / deals.length) : 0;

  const stats = [
    { label: "Total Spent", val: fmtMoney(totalSpent), color: "#ff4d6d", icon: "💸" },
    { label: "Pipeline", val: fmtMoney(pipeline), color: "#f5a623", icon: "📊" },
    { label: "Closed", val: fmtMoney(closed), color: "#00d084", icon: "✅" },
    { label: "Hot Leads", val: hot, color: "#c084fc", icon: "🔥" },
    { label: "Avg Deal Age", val: `${avgDays}d`, color: "#4d9fff", icon: "⏱" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: "#7c6fff", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Command Center</div>
        <div style={{ fontFamily: "'Clash Display', 'DM Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
          Wholesaler<br /><span style={{ background: "linear-gradient(90deg,#7c6fff,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Dashboard</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        {stats.map(s => (
          <Card key={s.label} accent={s.color} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ color: s.color, fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
              <div style={{ color: "#3a3060", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
            </div>
          </Card>
        ))}
        <Card style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", gridColumn: "span 1" }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{deals.length}</div>
            <div style={{ color: "#3a3060", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>Total Deals</div>
          </div>
        </Card>
      </div>

      {/* Cash runway alert */}
      <Card accent={totalSpent > 400 ? "#ff4d4d" : "#00d084"} style={{ marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22 }}>{totalSpent > 400 ? "⚠️" : "✅"}</span>
        <div>
          <div style={{ color: totalSpent > 400 ? "#ff4d4d" : "#00d084", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
            {totalSpent > 400 ? "Budget getting tight — watch your runway" : "Cash runway looks healthy"}
          </div>
          <div style={{ color: "#3a3060", fontSize: 12, lineHeight: 1.6 }}>
            Keep at least $500 unspent. Deals take 45–75 days to close — you need 3 months of marketing budget in reserve.
          </div>
        </div>
      </Card>

      {/* Recent deals */}
      {deals.length > 0 && (
        <div>
          <SectionTitle>Recent Deals</SectionTitle>
          {deals.slice(-3).reverse().map(d => {
            const days = getDaysSince(d.startDate);
            const stageColor = d.stage === 4 ? "#00d084" : d.stage >= 3 ? "#f5a623" : "#7c6fff";
            return (
              <Card key={d.id} style={{ marginBottom: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ color: "#e8e0ff", fontWeight: 700, fontSize: 14 }}>{d.name || "Unnamed"}</div>
                    <div style={{ color: "#3a3060", fontSize: 12, marginTop: 2 }}>{STAGES[d.stage]} · {days}d in pipeline</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {d.leadScore && <div style={{ color: d.leadScore >= 8 ? "#ff4d4d" : d.leadScore >= 5 ? "#f5a623" : "#4d9fff", fontWeight: 800, fontSize: 13 }}>Score: {d.leadScore}/10</div>}
                    <div style={{ color: "#00d084", fontSize: 12 }}>{fmtMoney(d.expectedFee)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 3, background: "#1a1630", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${(d.stage / 4) * 100}%`, background: stageColor, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {deals.length === 0 && (
        <Card style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏘️</div>
          <div style={{ color: "#3a3060", fontSize: 14 }}>No deals yet — use the Lead Analyzer to score your first lead</div>
        </Card>
      )}
    </div>
  );
}

// ─── LEAD ANALYZER TAB ────────────────────────────────────────────────────────

function LeadAnalyzer({ onSaveDeal }) {
  const [form, setForm] = useState({ name: "", address: "", equity: "", ownership_length: "", occupancy: "", distress_flags: "", property_condition: "", other_notes: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState("opener");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const analyze = async () => {
    if (!form.name || !form.address) { setError("Owner name and address required."); return; }
    setError(null); setLoading(true); setResult(null); setSaved(false);
    const summary = Object.entries(form).map(([k, v]) => v ? `${k.replace(/_/g, " ")}: ${v}` : null).filter(Boolean).join("\n");
    try {
      const r = await callClaude(LEAD_PROMPT, `Analyze this wholesale lead:\n\n${summary}`);
      setResult(r);
    } catch { setError("Analysis failed. Please try again."); }
    setLoading(false);
  };

  const saveToPipeline = () => {
    onSaveDeal({
      id: uid(), name: form.address || form.name,
      startDate: new Date().toISOString().split("T")[0],
      stage: 1, marketingSpent: 0, expectedFee: 0,
      notes: form.distress_flags || "", leadScore: result?.score,
      leadLabel: result?.score_label
    });
    setSaved(true);
  };

  const scoreColor = result ? (result.score >= 8 ? "#ff4d4d" : result.score >= 5 ? "#f5a623" : "#4d9fff") : "#7c6fff";
  const sections = [
    { key: "opener", label: "Opener", content: result?.script?.opener, isArr: false },
    { key: "value_prop", label: "Value Prop", content: result?.script?.value_prop, isArr: false },
    { key: "qualifying_questions", label: "Qualifying Questions", content: result?.script?.qualifying_questions, isArr: true },
    { key: "objection_handler", label: "Objection Handler", content: result?.script?.objection_handler, isArr: false },
    { key: "close", label: "Close", content: result?.script?.close, isArr: false },
  ];

  return (
    <div>
      <SectionTitle>Lead Intelligence Agent</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {[
          { k: "name", l: "Owner Name", req: true, p: "John Smith" },
          { k: "address", l: "Property Address", req: true, p: "123 Oak St, Dallas TX" },
          { k: "equity", l: "Estimated Equity", p: "65% / $120k" },
          { k: "ownership_length", l: "Years Owned", p: "12 years" },
          { k: "occupancy", l: "Occupancy", p: "Absentee / Vacant / Owner-occupied" },
          { k: "distress_flags", l: "Distress Flags", p: "Tax delinquent, pre-foreclosure..." },
          { k: "property_condition", l: "Property Condition", p: "Needs major repairs..." },
          { k: "other_notes", l: "Other Notes", p: "Any extra context..." },
        ].map(f => (
          <Field key={f.k} label={f.l} required={f.req}>
            <Input value={form[f.k]} onChange={set(f.k)} placeholder={f.p} />
          </Field>
        ))}
        {error && <div style={{ color: "#ff4d4d", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,77,77,0.08)", borderRadius: 8 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading} style={{ width: "100%" }}>
          {loading ? "⚡ Analyzing..." : "⚡ Analyze Lead"}
        </Btn>
      </Card>

      {result && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

          {/* Score */}
          <Card accent={scoreColor} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center", minWidth: 70 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 42, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{result.score}</div>
              <div style={{ color: scoreColor, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>{result.score_label?.toUpperCase()}</div>
            </div>
            <div style={{ flex: 1 }}>
              {result.motivation_reasons?.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
                  <span style={{ color: "#7c6fff", fontSize: 13 }}>✓</span>
                  <span style={{ color: "#b0a8e0", fontSize: 13, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
              {result.watch_outs?.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
                  <span style={{ color: "#f5a623", fontSize: 13 }}>⚠</span>
                  <span style={{ color: "#8a7a60", fontSize: 13, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Save button */}
          {!saved ? (
            <Btn onClick={saveToPipeline} style={{ width: "100%", marginBottom: 14, background: "linear-gradient(135deg,#00d08422,#00d08444)", border: "1px solid #00d08466", color: "#00d084" }}>
              + Save to Pipeline
            </Btn>
          ) : (
            <div style={{ textAlign: "center", color: "#00d084", fontWeight: 700, fontSize: 13, marginBottom: 14, padding: "10px", background: "#00d08411", borderRadius: 10 }}>✓ Saved to Pipeline</div>
          )}

          {/* Script accordion */}
          <Card>
            <SectionTitle>📞 Cold Call Script</SectionTitle>
            {sections.map(s => (
              <div key={s.key} style={{ borderBottom: "1px solid #1a1630" }}>
                <button onClick={() => setOpenSection(openSection === s.key ? null : s.key)} style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 0", color: "#8a80c0", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase"
                }}>
                  {s.label}
                  <span style={{ color: "#7c6fff", fontSize: 16, transition: "transform 0.2s", transform: openSection === s.key ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openSection === s.key && (
                  <div style={{ paddingBottom: 12 }}>
                    {s.isArr
                      ? s.content?.map((item, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}><span style={{ color: "#7c6fff", fontWeight: 800, fontSize: 12 }}>{i + 1}.</span><span style={{ color: "#c0b8e8", fontSize: 13, lineHeight: 1.6 }}>{item}</span></div>)
                      : <p style={{ color: "#c0b8e8", fontSize: 13, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>"{s.content}"</p>
                    }
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── EXIT MATCHER TAB ─────────────────────────────────────────────────────────

function ExitMatcher() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [openExit, setOpenExit] = useState(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const analyze = async () => {
    if (!form.address) { setError("Property address required."); return; }
    setError(null); setLoading(true); setResult(null);
    const summary = [
      form.address && `Address: ${form.address}`,
      form.arv && `ARV: $${form.arv}`,
      form.asking && `Asking Price: $${form.asking}`,
      form.repairs && `Repairs: $${form.repairs}`,
      form.situation && `Seller Situation: ${form.situation}`,
      form.mortgage && `Mortgage Balance: $${form.mortgage}`,
      form.condition && `Condition: ${form.condition}`,
      form.buyers && `Buyer Network: ${form.buyers}`,
      form.notes && `Notes: ${form.notes}`,
    ].filter(Boolean).join("\n");
    try {
      const r = await callClaude(EXIT_PROMPT, `Analyze exit strategies:\n\n${summary}`);
      setResult(r);
      setOpenExit(0);
    } catch { setError("Analysis failed. Please try again."); }
    setLoading(false);
  };

  return (
    <div>
      <SectionTitle>Exit Strategy Matcher</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {[
          { k: "address", l: "Property Address", req: true, p: "123 Oak St, Dallas TX" },
          { k: "arv", l: "ARV ($)", p: "250000", type: "number" },
          { k: "asking", l: "Seller Asking Price ($)", p: "140000", type: "number" },
          { k: "repairs", l: "Estimated Repairs ($)", p: "45000", type: "number" },
          { k: "situation", l: "Seller's Situation", p: "Pre-foreclosure, inherited, tired landlord..." },
          { k: "mortgage", l: "Mortgage Balance ($)", p: "85000 or paid off", type: "text" },
          { k: "condition", l: "Property Condition", p: "Needs full rehab / cosmetic / move-in ready" },
          { k: "buyers", l: "Your Buyer Network", p: "Strong / limited / none yet" },
          { k: "notes", l: "Other Notes", p: "Vacant, HOA, weird title..." },
        ].map(f => (
          <Field key={f.k} label={f.l} required={f.req}>
            <Input value={form[f.k] || ""} onChange={set(f.k)} placeholder={f.p} type={f.type || "text"} />
          </Field>
        ))}
        {error && <div style={{ color: "#ff4d4d", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,77,77,0.08)", borderRadius: 8 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading} style={{ width: "100%" }}>
          {loading ? "⚡ Analyzing..." : "⚡ Find Best Exit"}
        </Btn>
      </Card>

      {result && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <Card accent="#f5a623" style={{ marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div>
              <div style={{ color: "#f5a623", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>First Move Tomorrow</div>
              <div style={{ color: "#d4a060", fontSize: 13, lineHeight: 1.6 }}>{result.best_first_move}</div>
            </div>
          </Card>

          <SectionTitle>Ranked Exits</SectionTitle>
          {result.ranked_exits?.map((exit, i) => {
            const color = STRATEGY_COLORS[exit.strategy] || "#7c6fff";
            const icon = STRATEGY_ICONS[exit.strategy] || "📌";
            const isOpen = openExit === i;
            return (
              <Card key={exit.strategy} accent={i === 0 ? color : null} style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                <button onClick={() => setOpenExit(isOpen ? null : i)} style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, textAlign: "left"
                }}>
                  {i === 0 && <div style={{ background: color, color: "#000", fontSize: 8, fontWeight: 800, letterSpacing: 1.5, padding: "3px 6px", borderRadius: 4, textTransform: "uppercase", flexShrink: 0 }}>TOP PICK</div>}
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e8e0ff", fontWeight: 700, fontSize: 13 }}>{exit.strategy}</div>
                    <div style={{ height: 4, background: "#1a1630", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${exit.fit_score * 10}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                  <span style={{ color: color, fontWeight: 800, fontSize: 13 }}>{exit.fit_score}/10</span>
                  <span style={{ color: "#3a3060", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1a1630" }}>
                    <p style={{ color: "#a0a0c0", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>{exit.why_it_fits}</p>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "#3a3060", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Steps</div>
                      {exit.how_to_execute?.map((step, j) => (
                        <div key={j} style={{ display: "flex", gap: 10, marginBottom: 7, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: color + "22", border: `1px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color, flexShrink: 0 }}>{j + 1}</div>
                          <span style={{ color: "#c0b8e0", fontSize: 13, lineHeight: 1.6 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "rgba(245,166,35,0.06)", border: "1px solid #f5a62333", borderRadius: 8, padding: "9px 12px", display: "flex", gap: 8 }}>
                      <span>⚠️</span>
                      <span style={{ color: "#a07840", fontSize: 12, lineHeight: 1.6 }}>{exit.watch_out}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {result.dead_ends?.length > 0 && (
            <Card style={{ marginTop: 4 }}>
              <SectionTitle>Won't Work for This Deal</SectionTitle>
              {result.dead_ends.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#3a3060" }}>✕</span>
                  <span style={{ color: "#3a3060", fontSize: 13 }}>{d}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE TAB ─────────────────────────────────────────────────────────────

function Pipeline({ deals, setDeals, expenses, setExpenses }) {
  const [modal, setModal] = useState(null);
  const [subTab, setSubTab] = useState("deals");
  const [newExp, setNewExp] = useState({ label: "", amount: "", date: new Date().toISOString().split("T")[0] });

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    + deals.reduce((s, d) => s + Number(d.marketingSpent || 0), 0);
  const totalFees = deals.filter(d => d.stage === 4).reduce((s, d) => s + Number(d.expectedFee || 0), 0);

  const saveDeal = (f) => {
    const d = { ...f, marketingSpent: Number(f.marketingSpent) || 0, expectedFee: Number(f.expectedFee) || 0 };
    setDeals(p => d.id && p.find(x => x.id === d.id) ? p.map(x => x.id === d.id ? d : x) : [...p, { ...d, id: uid() }]);
    setModal(null);
  };

  const addExp = () => {
    if (!newExp.label || !newExp.amount) return;
    setExpenses(p => [...p, { ...newExp, id: uid(), amount: Number(newExp.amount) }]);
    setNewExp({ label: "", amount: "", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <div>
      <SectionTitle>Cash Conversion Tracker</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { l: "Spent", v: fmtMoney(totalSpent), c: "#ff4d4d" },
          { l: "Pipeline", v: fmtMoney(deals.filter(d => d.stage < 4).reduce((s, d) => s + Number(d.expectedFee || 0), 0)), c: "#f5a623" },
          { l: "Closed", v: fmtMoney(totalFees), c: "#00d084" },
        ].map(s => (
          <Card key={s.l} accent={s.c} style={{ padding: "12px 14px" }}>
            <div style={{ color: s.c, fontSize: 18, fontWeight: 800 }}>{s.v}</div>
            <div style={{ color: "#3a3060", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", background: "#08071a", borderRadius: 10, padding: 3, marginBottom: 16, gap: 3 }}>
        {["deals", "expenses"].map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
            background: subTab === t ? "#1e1a3a" : "transparent",
            color: subTab === t ? "#c084fc" : "#3a3060",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
            textTransform: "capitalize"
          }}>{t === "deals" ? "📋 Deals" : "💸 Expenses"}</button>
        ))}
      </div>

      {subTab === "deals" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#3a3060", fontSize: 12 }}>{deals.length} deal{deals.length !== 1 ? "s" : ""}</span>
            <Btn small onClick={() => setModal({ id: null, name: "", startDate: new Date().toISOString().split("T")[0], stage: 0, marketingSpent: "", expectedFee: "", notes: "" })}>+ Add Deal</Btn>
          </div>

          {deals.length === 0 && <Card style={{ textAlign: "center", padding: "28px 16px", color: "#3a3060", fontSize: 13 }}>No deals yet — score a lead and save it to pipeline</Card>}

          {deals.map(d => {
            const days = getDaysSince(d.startDate);
            const urgColor = days > 75 ? "#ff4d4d" : days > 45 ? "#f5a623" : "#00d084";
            return (
              <Card key={d.id} style={{ marginBottom: 10, padding: "13px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#e8e0ff", fontWeight: 700, fontSize: 14 }}>{d.name || "Unnamed"}</div>
                    {d.leadScore && <div style={{ color: d.leadScore >= 8 ? "#ff4d4d" : d.leadScore >= 5 ? "#f5a623" : "#4d9fff", fontSize: 11, fontWeight: 700, marginTop: 2 }}>Lead Score: {d.leadScore}/10 · {d.leadLabel}</div>}
                    {d.notes && <div style={{ color: "#3a3060", fontSize: 12, marginTop: 2 }}>{d.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Btn small onClick={() => setModal(d)}>Edit</Btn>
                    <Btn small variant="danger" onClick={() => setDeals(p => p.filter(x => x.id !== d.id))}>✕</Btn>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  {STAGES.map((s, i) => <div key={i} style={{ fontSize: 8, color: i <= d.stage ? "#7c6fff" : "#2a2040", fontWeight: 700, flex: 1, textAlign: "center" }}>{s}</div>)}
                </div>
                <div style={{ height: 3, background: "#1a1630", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(d.stage / 4) * 100}%`, background: "linear-gradient(90deg,#7c6fff,#c084fc)", borderRadius: 2 }} />
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12 }}><span style={{ color: "#3a3060" }}>Days: </span><span style={{ color: urgColor, fontWeight: 700 }}>{days}d</span></span>
                  <span style={{ fontSize: 12 }}><span style={{ color: "#3a3060" }}>Spent: </span><span style={{ color: "#ff4d4d", fontWeight: 700 }}>-{fmtMoney(d.marketingSpent)}</span></span>
                  <span style={{ fontSize: 12 }}><span style={{ color: "#3a3060" }}>Expected: </span><span style={{ color: "#00d084", fontWeight: 700 }}>+{fmtMoney(d.expectedFee)}</span></span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {subTab === "expenses" && (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Add Expense</SectionTitle>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 120 }}><Input value={newExp.label} onChange={e => setNewExp(p => ({ ...p, label: e.target.value }))} placeholder="PropStream, skip tracing..." /></div>
              <div style={{ width: 80 }}><Input value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} placeholder="$" type="number" /></div>
              <Btn onClick={addExp}>Add</Btn>
            </div>
          </Card>
          {expenses.map(e => (
            <Card key={e.id} style={{ marginBottom: 8, padding: "11px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ color: "#e8e0ff", fontSize: 14, fontWeight: 600 }}>{e.label}</div><div style={{ color: "#3a3060", fontSize: 11 }}>{e.date}</div></div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#ff4d4d", fontWeight: 700 }}>-{fmtMoney(e.amount)}</span>
                <Btn small variant="danger" onClick={() => setExpenses(p => p.filter(x => x.id !== e.id))}>✕</Btn>
              </div>
            </Card>
          ))}
          <div style={{ borderTop: "1px solid #1a1630", paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#3a3060", fontWeight: 700, fontSize: 13 }}>Total Overhead</span>
            <span style={{ color: "#ff4d4d", fontWeight: 800, fontSize: 15 }}>-{fmtMoney(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
          </div>
        </div>
      )}

      {/* Deal Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#0c0b1e", border: "1px solid #2a2040", borderRadius: 16, padding: 22, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#e8e0ff", marginBottom: 18 }}>{modal.id ? "Edit Deal" : "Add Deal"}</div>
            {[
              { k: "name", l: "Deal Name / Address" },
              { k: "startDate", l: "Start Date", type: "date" },
              { k: "marketingSpent", l: "Marketing Spent ($)", type: "number" },
              { k: "expectedFee", l: "Expected Assignment Fee ($)", type: "number" },
              { k: "notes", l: "Notes" },
            ].map(f => (
              <Field key={f.k} label={f.l}>
                <Input type={f.type || "text"} value={modal[f.k] || ""} onChange={e => setModal(p => ({ ...p, [f.k]: e.target.value }))} placeholder="" />
              </Field>
            ))}
            <Field label="Stage">
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {STAGES.map((s, i) => (
                  <button key={i} onClick={() => setModal(p => ({ ...p, stage: i }))} style={{
                    padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: modal.stage === i ? "#7c6fff" : "#1a1630",
                    color: modal.stage === i ? "#fff" : "#4a4070",
                    border: `1px solid ${modal.stage === i ? "#7c6fff" : "#2a2040"}`
                  }}>{s}</button>
                ))}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, background: "#1a1630", border: "1px solid #2a2040", borderRadius: 9, padding: 11, color: "#4a4070", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Cancel</button>
              <button onClick={() => saveDeal(modal)} style={{ flex: 2, background: "linear-gradient(135deg,#7c6fff,#c084fc)", border: "none", borderRadius: 9, padding: 11, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("overview");
  const [deals, setDeals] = useState([]);
  const [expenses, setExpenses] = useState([
    { id: 1, label: "PropStream", amount: 99, date: new Date().toISOString().split("T")[0] }
  ]);

  const addDeal = (d) => setDeals(p => [...p, d]);

  const TABS = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "leads", label: "Lead AI", icon: "🔍" },
    { id: "exits", label: "Exit AI", icon: "🚪" },
    { id: "pipeline", label: "Pipeline", icon: "📋" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0f0d2a 0%, #06050f 60%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e8e0ff",
      boxSizing: "border-box"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{
        background: "rgba(8,7,26,0.95)", borderBottom: "1px solid #1a1630",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c6fff", boxShadow: "0 0 10px #7c6fff" }} />
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>Wholesaler <span style={{ color: "#7c6fff" }}>OS</span></span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d084" }} />
          <span style={{ color: "#3a3060", fontSize: 11 }}>AI Powered</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 14px 100px" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === "overview" && <Overview deals={deals} expenses={expenses} />}
        {tab === "leads" && <LeadAnalyzer onSaveDeal={addDeal} />}
        {tab === "exits" && <ExitMatcher />}
        {tab === "pipeline" && <Pipeline deals={deals} setDeals={setDeals} expenses={expenses} setExpenses={setExpenses} />}
      </div>
    </div>
  );
}
