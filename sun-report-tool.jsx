import { useState, useEffect, useCallback } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const REPORT_TYPES = [
  "MH 1049","EPI","NUTRITION LOGBOOK","NUTRITION SUMMARY SHEET","HTS",
  "PMTCT MATERNITY","PMTCT","INFANT FORMULA","SMC","SMC DEMAND CREATION",
  "FRIDGE CHART","TB","CONDOM","ICF","MH 2072","ARV ROLLOUT",
  "ART MONTHLY REPORT","HIIs","RATION COVERAGE","CHBC","ASRH",
  "CERVICAL CANCER","MATERNAL & PERINATAL","MMRI 4","MMRI 2",
  "DRUG AVAILABILITY","MENTAL DISORDERS","HOME VISITS","SCHOOL HEALTH",
  "UNDER 5 DEATH REPORT","HEALTH TALK","MALARIA","MIN. PROG. REQ.",
  "INFANT COHORT","MCC","IEC DISTRIBUTION","COHORT"
];

const FACILITIES = [
  "MAGOKOTSWANE","Moamogwa","Moswlele","BORIBAMO","Suping","LOOLOGANE",
  "BOKAA","Ramakgatlanyane","BORAKALALO","Maanege","Mmaothate",
  "MMANKGODI","Ramaphatle","Morepo","Dikhutsana","Mankgodi East","Phiriyabokwete",
  "BOATLANAME","Hubasanoko","SOJWE","Kokonje",
  "LEPHEPE","Motlabaki","LEKGWAPHENG","Mosokotso","Gathoka",
  "KGOPE","Dikgatlhong","LOSILAKGOKONG","Mapapeng","Ramagapu",
  "HATSALATLADI","Moselele","Rasegwagwa","MOGONONO","Mosekele",
  "MEDIE","Moetlo","MAHETLWE","Sekhukhwane",
  "GAKUTO","Mononyane","GAKGATLA","Chaoka","Mmasebele",
  "GAMODUBU","Mmamhiko","Kemenakwe","DITSHUKUDU","Mmamarobole",
  "SHADISHADI","Shonono","KOPONG","Sasakwe","Kgaphamadi",
  "KUMAKWANE","Mophakane","KUBUNG","Dam 18","Sepene","Rammidi","Tlapeng",
  "LENTSWELETAU","Ramankhung","RUGWANA","Matsila","Seokangwane","Diphepe","Marotse",
  "KWENENG HEALTH POST","PHUTING","Mmampaba","Ramasenyane",
  "MMATSETA","Galekgatshwane","BOSWELAKOKO","Mosinki","Khuduyamajako",
  "MMANOKO","Mmakanke","KGOSING","PHUTHADIKOBO","MCE",
  "SLH","THAMAGA HOSP","PRISON","THAMAGA MAIN CLINIC","A.S DADA KUMAKWANE","TEBELOPELE"
];

const STORAGE_KEY = "srt_report_tracker_2026";

const STATUS_CONFIG = {
  null: { label: "—", bg: "#1e2535", color: "#4a5568", title: "Not set" },
  0:    { label: "0", bg: "#3d1a1a", color: "#f87171", title: "Not submitted" },
  1:    { label: "1", bg: "#3d2e0a", color: "#fbbf24", title: "Submitted after 5th" },
  2:    { label: "2", bg: "#0d2e1a", color: "#34d399", title: "Submitted on/before 5th" },
};

function cycleValue(v) {
  if (v === null || v === undefined) return 2;
  if (v === 2) return 1;
  if (v === 1) return 0;
  return null;
}

// Inline SRT icon SVG
const SRTIcon = ({ size = 36 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} style={{ borderRadius: size * 0.21, flexShrink: 0 }}>
    <defs>
      <linearGradient id="srt-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:"#0ea5e9",stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:"#0369a1",stopOpacity:1}} />
      </linearGradient>
      <linearGradient id="srt-sun" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:"#fde68a",stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:"#f59e0b",stopOpacity:1}} />
      </linearGradient>
      <linearGradient id="srt-doc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:"#ffffff",stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:"#e0f2fe",stopOpacity:1}} />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="108" ry="108" fill="url(#srt-bg)"/>
    <g transform="translate(256,256)">
      {[0,45,90,135,180,225,270,315].map(r => (
        <rect key={r} x="-14" y="-148" width="28" height="52" rx="14" fill="url(#srt-sun)" opacity="0.9" transform={`rotate(${r})`}/>
      ))}
      <circle cx="0" cy="0" r="90" fill="url(#srt-sun)"/>
    </g>
    <rect x="184" y="188" width="144" height="172" rx="14" ry="14" fill="url(#srt-doc)" opacity="0.97"/>
    <polygon points="296,188 328,220 296,220" fill="#bae6fd"/>
    <rect x="296" y="188" width="32" height="32" rx="4" fill="#7dd3fc" opacity="0.5"/>
    <rect x="204" y="236" width="72" height="10" rx="5" fill="#0369a1" opacity="0.35"/>
    <rect x="204" y="256" width="104" height="10" rx="5" fill="#0369a1" opacity="0.25"/>
    <rect x="204" y="276" width="90" height="10" rx="5" fill="#0369a1" opacity="0.25"/>
    <circle cx="256" cy="320" r="30" fill="#0ea5e9"/>
    <polyline points="242,320 252,331 272,309" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function SunReportTool() {
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterFacility, setFilterFacility] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result) setData(JSON.parse(result.value));
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (newData) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(newData));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (_) {}
  }, []);

  const getCell = (month, facility, report) =>
    data[month]?.[facility]?.[report] ?? null;

  const setCell = (month, facility, report, value) => {
    const newData = {
      ...data,
      [month]: {
        ...(data[month] || {}),
        [facility]: {
          ...(data[month]?.[facility] || {}),
          [report]: value,
        },
      },
    };
    setData(newData);
    save(newData);
  };

  const handleCellClick = (facility, report) => {
    const cur = getCell(activeMonth, facility, report);
    setCell(activeMonth, facility, report, cycleValue(cur));
  };

  const calcStats = () => {
    const filtered = filterFacility
      ? FACILITIES.filter(f => f.toLowerCase().includes(filterFacility.toLowerCase()))
      : FACILITIES;
    let total = 0, submitted = 0, onTime = 0;
    for (const f of filtered) {
      for (const r of REPORT_TYPES) {
        const v = getCell(activeMonth, f, r);
        total++;
        if (v === 1 || v === 2) submitted++;
        if (v === 2) onTime++;
      }
    }
    const completeness = total ? ((submitted / total) * 100).toFixed(1) : 0;
    const timeliness = submitted ? ((onTime / submitted) * 100).toFixed(1) : 0;
    return { total, submitted, onTime, completeness, timeliness };
  };

  const stats = calcStats();
  const visibleFacilities = filterFacility
    ? FACILITIES.filter(f => f.toLowerCase().includes(filterFacility.toLowerCase()))
    : FACILITIES;

  const clearMonth = () => {
    const newData = { ...data };
    delete newData[activeMonth];
    setData(newData);
    save(newData);
  };

  if (loading) return (
    <div style={{ background: "#0f1623", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "#7dd3fc", fontFamily: "monospace", fontSize: 18 }}>
      <SRTIcon size={40}/> Loading…
    </div>
  );

  return (
    <div style={{ background: "#0f1623", minHeight: "100vh", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f1623; }
        ::-webkit-scrollbar-thumb { background: #2d3a52; border-radius: 3px; }
        .cell-btn { cursor: pointer; border: none; transition: transform 0.1s, filter 0.1s; user-select: none; }
        .cell-btn:hover { filter: brightness(1.4); transform: scale(1.15); z-index: 10; position: relative; }
        .cell-btn:active { transform: scale(0.92); }
        .month-tab { cursor: pointer; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; transition: all 0.15s; letter-spacing: 0.05em; border: none; font-family: 'DM Mono', monospace; }
        .month-tab:hover { background: #1e2d45 !important; }
        .stat-card { background: #141f30; border: 1px solid #1e2d45; border-radius: 12px; padding: 16px 20px; }
        .report-header { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10px; white-space: nowrap; padding: 8px 4px; color: #94a3b8; letter-spacing: 0.05em; }
        .facility-row:hover > td { background: #141f30 !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0a1020", borderBottom: "1px solid #1e2d45", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SRTIcon size={42}/>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "#7dd3fc", letterSpacing: "-0.02em" }}>
                  Sun Report Tool
                </span>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "#0ea5e9", letterSpacing: "0.1em", opacity: 0.8 }}>SRT</span>
              </div>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>KWENENG DISTRICT · 2026 · HEALTH REPORTS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {savedFlash && <span style={{ fontSize: 11, color: "#34d399", letterSpacing: "0.05em" }}>● SAVED</span>}
            <input
              placeholder="Filter facility…"
              value={filterFacility}
              onChange={e => setFilterFacility(e.target.value)}
              style={{ background: "#141f30", border: "1px solid #2d3a52", borderRadius: 6, color: "#e2e8f0", padding: "6px 12px", fontSize: 12, width: 160, fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Month tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
          {MONTHS.map((m, i) => (
            <button key={m} className="month-tab"
              onClick={() => setActiveMonth(i)}
              style={{
                background: activeMonth === i ? "#0369a1" : "#141f30",
                color: activeMonth === i ? "#fff" : "#64748b",
                border: activeMonth === i ? "1px solid #0ea5e9" : "1px solid #1e2d45",
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 12, padding: "16px 24px", flexWrap: "wrap" }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>COMPLETENESS</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: parseFloat(stats.completeness) >= 80 ? "#34d399" : parseFloat(stats.completeness) >= 50 ? "#fbbf24" : "#f87171" }}>
            {stats.completeness}%
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>{stats.submitted} of {stats.total} submitted</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>TIMELINESS</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: parseFloat(stats.timeliness) >= 80 ? "#34d399" : parseFloat(stats.timeliness) >= 50 ? "#fbbf24" : "#f87171" }}>
            {stats.timeliness}%
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>{stats.onTime} on time (≤5th)</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>LATE REPORTS</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "#fbbf24" }}>
            {stats.submitted - stats.onTime}
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>submitted after 5th</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>NOT SUBMITTED</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "#f87171" }}>
            {stats.total - stats.submitted}
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>missing reports</div>
        </div>
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", marginBottom: 6 }}>LEGEND</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[2,1,0].map(v => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ display: "inline-block", width: 20, height: 16, borderRadius: 3, background: STATUS_CONFIG[v].bg, border: `1px solid ${STATUS_CONFIG[v].color}`, textAlign: "center", lineHeight: "16px", color: STATUS_CONFIG[v].color, fontSize: 10 }}>{v}</span>
                <span style={{ color: "#64748b" }}>{STATUS_CONFIG[v].title}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ display: "inline-block", width: 20, height: 16, borderRadius: 3, background: "#1e2535", border: "1px solid #2d3a52", textAlign: "center", lineHeight: "16px", color: "#4a5568", fontSize: 10 }}>—</span>
              <span style={{ color: "#64748b" }}>Not set</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={clearMonth} style={{ background: "#1e1020", border: "1px solid #3d1a2e", borderRadius: 6, color: "#f87171", padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em" }}>
            CLEAR {MONTHS[activeMonth].toUpperCase()}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: "auto", padding: "0 24px 24px", maxHeight: "calc(100vh - 320px)" }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
            <tr>
              <th style={{
                position: "sticky", left: 0, zIndex: 30, background: "#0a1020",
                minWidth: 160, padding: "4px 8px", textAlign: "left",
                borderBottom: "1px solid #1e2d45", borderRight: "1px solid #1e2d45",
                fontSize: 10, color: "#475569", letterSpacing: "0.1em"
              }}>
                FACILITY ({visibleFacilities.length})
              </th>
              {REPORT_TYPES.map(r => (
                <th key={r} style={{ background: "#0a1020", borderBottom: "1px solid #1e2d45", borderRight: "1px solid #111827", width: 28, minWidth: 28, maxWidth: 28 }}>
                  <div className="report-header">{r}</div>
                </th>
              ))}
              <th style={{ background: "#0a1020", borderBottom: "1px solid #1e2d45", minWidth: 60, padding: "0 8px", fontSize: 10, color: "#475569" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {visibleFacilities.map((facility, fi) => {
              let fSubmitted = 0, fOnTime = 0, fTotal = REPORT_TYPES.length;
              REPORT_TYPES.forEach(r => {
                const v = getCell(activeMonth, facility, r);
                if (v === 1 || v === 2) fSubmitted++;
                if (v === 2) fOnTime++;
              });
              const fPct = fTotal ? Math.round((fSubmitted / fTotal) * 100) : 0;
              return (
                <tr key={facility} className="facility-row">
                  <td style={{
                    position: "sticky", left: 0, zIndex: 10,
                    background: fi % 2 === 0 ? "#0f1623" : "#111827",
                    padding: "2px 8px", borderRight: "1px solid #1e2d45",
                    fontSize: 11, color: "#cbd5e1", whiteSpace: "nowrap",
                    fontWeight: facility === facility.toUpperCase() ? 600 : 400,
                  }}>
                    {facility}
                  </td>
                  {REPORT_TYPES.map(r => {
                    const v = getCell(activeMonth, facility, r);
                    const cfg = STATUS_CONFIG[v];
                    return (
                      <td key={r} style={{ background: fi % 2 === 0 ? "#0f1623" : "#111827", padding: 2, textAlign: "center", borderRight: "1px solid #111827" }}>
                        <button className="cell-btn"
                          title={`${facility} · ${r} · ${cfg.title}`}
                          onClick={() => handleCellClick(facility, r)}
                          style={{ width: 22, height: 20, borderRadius: 3, background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 600, fontFamily: "inherit", border: `1px solid ${v !== null ? cfg.color + "66" : "#1e2535"}` }}>
                          {cfg.label}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{
                    background: fi % 2 === 0 ? "#0f1623" : "#111827",
                    padding: "2px 8px", fontSize: 11, fontWeight: 600,
                    color: fPct >= 80 ? "#34d399" : fPct >= 50 ? "#fbbf24" : "#f87171",
                    borderLeft: "1px solid #1e2d45",
                  }}>
                    {fPct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "8px 24px 16px", fontSize: 10, color: "#2d3a52", letterSpacing: "0.05em" }}>
        SRT · CLICK CELL TO CYCLE: — → 2 (ON TIME) → 1 (LATE) → 0 (MISSING) → — · DATA SAVES AUTOMATICALLY
      </div>
    </div>
  );
}
