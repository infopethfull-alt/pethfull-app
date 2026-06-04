import { useState, useEffect, useCallback } from "react";
import * as DB from "./db.js";

// ─── DATA DEFAULTS ────────────────────────────────────────────────────────────
const STAFF_DEFAULT = [
  { id:"S01", name:"Aman",                role:"Service",       team:"Service"  },
  { id:"S02", name:"Ankit",               role:"Cleaning",      team:"Cleaning" },
  { id:"S03", name:"Ashok bhaiya",        role:"Cleaning",      team:"Cleaning" },
  { id:"S04", name:"Dev Narayan",         role:"Kitchen Staff", team:"Kitchen"  },
  { id:"S05", name:"Golu",                role:"Packing",       team:"Packing"  },
  { id:"S06", name:"Manoj bhaiya",        role:"Chef",          team:"Kitchen"  },
  { id:"S07", name:"Pankaj",              role:"Service",       team:"Service"  },
  { id:"S08", name:"Rajesh",              role:"Service",       team:"Service"  },
  { id:"S09", name:"Rambharos",           role:"Kitchen Staff", team:"Kitchen"  },
  { id:"S10", name:"Ranjan",              role:"Packing",       team:"Packing"  },
  { id:"S11", name:"Ranjit",              role:"Cleaning",      team:"Cleaning" },
  { id:"S12", name:"Satyanarayan bhaiya", role:"Chef",          team:"Kitchen"  },
  { id:"S13", name:"Sunil",               role:"Cleaning",      team:"Cleaning" },
  { id:"S14", name:"Suraj",               role:"Kitchen Staff", team:"Kitchen"  },
  { id:"S15", name:"Vishal",              role:"Kitchen Staff", team:"Kitchen"  },
];

const EVENTS_DEFAULT = [
  { type:"5-star rating",                    cat:"Positive", pts:5,   target:"Full Team"         },
  { type:"Customer complaint",               cat:"Negative", pts:-10, target:"Kitchen Team"       },
  { type:"Missing item complaint",           cat:"Negative", pts:-15, target:"Packing Team"       },
  { type:"No leakage/spillage for full week",cat:"Bonus",    pts:50,  target:"Packing Team"       },
  { type:"No missing item for full week",    cat:"Bonus",    pts:50,  target:"Packing Team"       },
  { type:"Packing appreciated online",       cat:"Positive", pts:10,  target:"Packing Team"       },
  { type:"Review with food photo",           cat:"Positive", pts:8,   target:"Kitchen + Service"  },
  { type:"Cleaning/Hygiene appreciated",     cat:"Positive", pts:10,  target:"Cleaning Team"      },
  { type:"Rude behaviour complaint",         cat:"Negative", pts:-20, target:"Named Staff"        },
  { type:"Staff name mentioned positively",  cat:"Positive", pts:15,  target:"Named Staff"        },
];

const SOURCES = ["Google","WhatsApp","Zomato","Swiggy","Personal"];
const WEEK_LABELS = [
  "Wk01 | 01 Jun – 07","Wk02 | 08 Jun – 14","Wk03 | 15 Jun – 21","Wk04 | 22 Jun – 28",
  "Wk05 | 29 Jun – 05 Jul","Wk06 | 06 Jul – 12","Wk07 | 13 Jul – 19","Wk08 | 20 Jul – 26",
  "Wk09 | 27 Jul – 02 Aug","Wk10 | 03 Aug – 09","Wk11 | 10 Aug – 16","Wk12 | 17 Aug – 23",
  "Wk13 | 24 Aug – 30","Wk14 | 31 Aug – 06 Sep","Wk15 | 07 Sep – 13","Wk16 | 14 Sep – 20",
  "Wk17 | 21 Sep – 27","Wk18 | 28 Sep – 04 Oct","Wk19 | 05 Oct – 11","Wk20 | 12 Oct – 18",
  "Wk21 | 19 Oct – 25","Wk22 | 26 Oct – 01 Nov","Wk23 | 02 Nov – 08","Wk24 | 09 Nov – 15",
  "Wk25 | 16 Nov – 22","Wk26 | 23 Nov – 29","Wk27 | 30 Nov – 06 Dec","Wk28 | 07 Dec – 13",
  "Wk29 | 14 Dec – 20","Wk30 | 21 Dec – 27","Wk31 | 28 Dec – 03 Jan","Wk32 | 04 Jan – 10",
  "Wk33 | 11 Jan – 17","Wk34 | 18 Jan – 24","Wk35 | 25 Jan – 31","Wk36 | 01 Feb – 07",
  "Wk37 | 08 Feb – 14","Wk38 | 15 Feb – 21","Wk39 | 22 Feb – 28","Wk40 | 01 Mar – 07",
  "Wk41 | 08 Mar – 14","Wk42 | 15 Mar – 21","Wk43 | 22 Mar – 28","Wk44 | 29 Mar – 04 Apr",
  "Wk45 | 05 Apr – 11","Wk46 | 12 Apr – 18","Wk47 | 19 Apr – 25","Wk48 | 26 Apr – 02 May",
  "Wk49 | 03 May – 09","Wk50 | 10 May – 16","Wk51 | 17 May – 23","Wk52 | 24 May – 30",
];

const TC = {
  Kitchen:  { bg:"#2A1800", txt:"#FFB347", brd:"#8B4A00", dot:"#FF8C00" },
  Service:  { bg:"#001830", txt:"#5BB8FF", brd:"#004080", dot:"#1E90FF" },
  Cleaning: { bg:"#001A00", txt:"#5CD65C", brd:"#1A5C00", dot:"#32CD32" },
  Packing:  { bg:"#1A001A", txt:"#D966FF", brd:"#660066", dot:"#BF40BF" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const r2 = n => Math.round(n * 100) / 100;  // round to 2 decimals everywhere

function getCurrentWeek() {
  const now = new Date(), start = new Date(2024, 5, 1);
  return Math.min(Math.max(Math.floor((now - start) / (7 * 24 * 3600 * 1000)), 0), 51);
}

// FIX: Kitchen+Service now splits WITHIN each team separately
// e.g. 8pts, 5 Kitchen + 3 Service → Kitchen each get 8/8=1, Service each get 8/8=1
// Actually per business rule: total pts divided by ALL affected staff combined
function getAffectedStaff(event, namedId, allStaff) {
  const t = event.target;
  if (t === "Full Team")         return allStaff.map(s => s.id);
  if (t === "Kitchen Team")      return allStaff.filter(s => s.team === "Kitchen").map(s => s.id);
  if (t === "Service Team")      return allStaff.filter(s => s.team === "Service").map(s => s.id);
  if (t === "Packing Team")      return allStaff.filter(s => s.team === "Packing").map(s => s.id);
  if (t === "Cleaning Team")     return allStaff.filter(s => s.team === "Cleaning").map(s => s.id);
  // Kitchen + Service: both teams combined, points divided among all of them
  if (t === "Kitchen + Service") return allStaff.filter(s => s.team === "Kitchen" || s.team === "Service").map(s => s.id);
  if (t === "Named Staff" && namedId) return [namedId];
  return [];
}

function calcPerPersonPts(totalPts, count, isNamed) {
  if (isNamed || count <= 1) return totalPts;
  return r2(totalPts / count);
}

const fmt  = n  => `₹${Math.abs(n).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const fmtP = n  => (n >= 0 ? "+" : "") + r2(n).toFixed(2);   // always 2 decimal places for points

const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const rowToEntry = r => ({
  id: r.id, weekIdx: r.week_idx, eventType: r.event_type, eventCat: r.event_cat,
  pts: r.pts, totalPts: r.total_pts, splitCount: r.split_count,
  target: r.target, source: r.source, staffId: r.staff_id, loggedAt: r.logged_at,
});

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const TeamChip = ({ team, sm }) => {
  const c = TC[team] || { bg:"#222", txt:"#aaa", brd:"#444", dot:"#888" };
  return (
    <span style={{ background:c.bg, color:c.txt, border:`1px solid ${c.brd}`,
      borderRadius:20, padding:sm?"1px 7px":"2px 10px", fontSize:sm?10:11,
      fontWeight:700, display:"inline-flex", alignItems:"center", whiteSpace:"nowrap", gap:4 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, display:"inline-block" }}/>
      {team}
    </span>
  );
};

const CatChip = ({ cat }) => {
  const m = { Positive:{bg:"#0D2B0D",c:"#5CDB5C"}, Negative:{bg:"#2B0D0D",c:"#FF6B6B"}, Bonus:{bg:"#2B2000",c:"#FFD700"} };
  const s = m[cat] || { bg:"#222", c:"#aaa" };
  return <span style={{ background:s.bg, color:s.c, borderRadius:12, padding:"2px 9px", fontSize:10, fontWeight:800 }}>{cat}</span>;
};

const Avt = ({ name, team, sz = 36 }) => {
  const c = TC[team] || { bg:"#1E1E1E", txt:"#aaa", brd:"#444" };
  const ini = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", background:c.bg, color:c.txt,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*.33,
      fontWeight:800, flexShrink:0, border:`1.5px solid ${c.brd}` }}>{ini}</div>
  );
};

// 2 decimal places always
const PtsBadge = ({ pts }) => (
  <span style={{ fontWeight:800, fontSize:12,
    color: pts===0?"#666": pts>0?"#5CDB5C":"#FF6B6B",
    background: pts===0?"#1A1A1A": pts>0?"#0A2A0A":"#2A0A0A",
    borderRadius:8, padding:"2px 9px", whiteSpace:"nowrap", fontFamily:"monospace" }}>
    {fmtP(pts)}
  </span>
);

const SyncDot = ({ synced, syncing }) => (
  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10,
    color: syncing?"#FFB347": synced?"#5CDB5C":"#FF6B6B" }}>
    <div style={{ width:7, height:7, borderRadius:"50%",
      background: syncing?"#FFB347": synced?"#5CDB5C":"#FF6B6B" }}/>
    {syncing?"Syncing…": synced?"Synced ✓":"Local only"}
  </div>
);

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState("dashboard");
  const [entries,  setEntries]  = useState([]);
  const [staff,    setStaff]    = useState(() => LS.get("ph_staff",  STAFF_DEFAULT));
  const [rules,    setRules]    = useState(() => LS.get("ph_rules",  EVENTS_DEFAULT));
  const [rate,     setRate]     = useState(() => LS.get("ph_rate",   1));
  // Payment status: { "staffId_weekIdx": "paid" | "pending" }
  const [payStatus,setPayStatus]= useState(() => LS.get("ph_pay_status", {}));
  const [ready,    setReady]    = useState(false);
  const [synced,   setSynced]   = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const cloud = DB.isConfigured();

  const toast$ = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    (async () => {
      if (cloud) {
        try {
          setSyncing(true);
          const [rows, staffVal, rulesVal, rateVal, payVal] = await Promise.all([
            DB.getEntries(),
            DB.getSetting("staff"),
            DB.getSetting("rules"),
            DB.getSetting("rate"),
            DB.getSetting("pay_status"),
          ]);
          if (Array.isArray(rows)) setEntries(rows.map(rowToEntry));
          if (staffVal) setStaff(JSON.parse(staffVal));
          if (rulesVal) setRules(JSON.parse(rulesVal));
          if (rateVal)  setRate(JSON.parse(rateVal));
          if (payVal)   setPayStatus(JSON.parse(payVal));
          setSynced(true);
        } catch(e) { setEntries(LS.get("ph_entries", [])); }
        finally    { setSyncing(false); }
      } else {
        setEntries(LS.get("ph_entries", []));
      }
      setReady(true);
    })();
  }, []);

  const saveStaff = async s => {
    setStaff(s); LS.set("ph_staff", s);
    if (cloud) await DB.setSetting("staff", s);
    toast$("Staff saved.");
  };
  const saveRules = async r => {
    setRules(r); LS.set("ph_rules", r);
    if (cloud) await DB.setSetting("rules", r);
    toast$("Rules saved.");
  };
  const saveRate = async r => {
    setRate(r); LS.set("ph_rate", r);
    if (cloud) await DB.setSetting("rate", r);
    toast$(`Rate: 1 pt = ₹${r}`);
  };
  const savePayStatus = async ps => {
    setPayStatus(ps); LS.set("ph_pay_status", ps);
    if (cloud) await DB.setSetting("pay_status", ps);
  };

  // ── Add event — supports qty (bulk logging) ────────────────────────────────
  const addEvent = useCallback(async (evObj, namedId, weekIdx, source, qty=1) => {
    const ids = getAffectedStaff(evObj, namedId, staff);
    if (!ids.length) { toast$("No staff matched.","warn"); return; }
    const isNamed   = evObj.target === "Named Staff";
    const perPerson = calcPerPersonPts(evObj.pts, ids.length, isNamed);
    const totalPts  = r2(evObj.pts * qty);
    const perPersonTotal = r2(perPerson * qty);

    // Each staff member gets qty × perPerson pts in ONE entry (cleaner history)
    const rows = ids.map(sid => ({
      id:         `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      weekIdx,
      eventType:  qty > 1 ? `${evObj.type} ×${qty}` : evObj.type,
      eventCat:   evObj.cat,
      pts:        perPersonTotal,
      totalPts,
      splitCount: ids.length,
      target:     evObj.target,
      source,
      staffId:    sid,
      loggedAt:   new Date().toISOString(),
    }));

    const updated = [...entries, ...rows];
    setEntries(updated);
    LS.set("ph_entries", updated);
    if (cloud) {
      setSyncing(true);
      try { await DB.insertEntries(rows); setSynced(true); } catch(e) { console.error(e); }
      setSyncing(false);
    }
    toast$(`Logged ${qty > 1 ? qty+"× " : ""}${evObj.type}! ${fmt(Math.abs(totalPts * rate))} split among ${ids.length} staff (${fmt(Math.abs(perPersonTotal * rate))} each).`);
  }, [entries, staff, rate, cloud]);

  const delEntry = useCallback(async id => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated); LS.set("ph_entries", updated);
    if (cloud) { try { await DB.deleteEntry(id); } catch(e) {} }
    toast$("Entry deleted.", "warn");
  }, [entries, cloud]);

  const resetAll = useCallback(async () => {
    setEntries([]); LS.set("ph_entries", []);
    if (cloud) { try { await DB.deleteAllEntries(); } catch(e) {} }
    toast$("All entries cleared.", "warn");
  }, [cloud]);

  const refresh = async () => {
    if (!cloud) return;
    setSyncing(true);
    try { const rows = await DB.getEntries(); if (Array.isArray(rows)) { setEntries(rows.map(rowToEntry)); setSynced(true); } }
    catch(e) {}
    setSyncing(false);
  };

  const scoreboard = staff.map(s => {
    const mine    = entries.filter(e => e.staffId === s.id);
    const totalPts = r2(mine.reduce((a,e) => a+e.pts, 0));
    return { ...s, totalPts, totalRupees: r2(totalPts*rate), count: mine.length };
  }).sort((a,b) => b.totalPts - a.totalPts);

  const cwi = getCurrentWeek();

  const S = {
    root:  { fontFamily:"'DM Sans',system-ui,sans-serif", minHeight:"100vh", background:"#0B0C12", color:"#E0E0F0" },
    card:  { background:"#141520", borderRadius:14, padding:"18px 20px", border:"1px solid #252636", marginBottom:16 },
    h1:    { fontSize:22, fontWeight:800, margin:"0 0 4px", color:"#F0F0FF" },
    sub:   { fontSize:12, color:"#666", margin:0 },
    lbl:   { fontSize:11, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:.08, display:"block", marginBottom:5 },
    inp:   { width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #2E2F3E", background:"#0E0F1A", color:"#E0E0F0", fontSize:14, outline:"none", boxSizing:"border-box" },
    sel:   { width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #2E2F3E", background:"#0E0F1A", color:"#E0E0F0", fontSize:14, outline:"none", boxSizing:"border-box", cursor:"pointer" },
    btn:   (v="pri") => ({ padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
               background:v==="pri"?"#6C63FF":v==="red"?"#8B0000":v==="grn"?"#1A4D1A":v==="yellow"?"#7A6000":"#252636",
               color:v==="ghost"?"#888":"#fff" }),
  };

  const TABS = [
    { id:"dashboard", icon:"◆", label:"Dashboard" },
    { id:"log",       icon:"＋", label:"Log Event" },
    { id:"paysheet",  icon:"₹",  label:"Pay Sheet" },
    { id:"scorecard", icon:"▦",  label:"Scorecard" },
    { id:"history",   icon:"≡",  label:"History"   },
    { id:"admin",     icon:"⚙",  label:"Admin"     },
  ];

  if (!ready) return (
    <div style={{...S.root, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <div style={{textAlign:"center",color:"#555"}}><div style={{fontSize:36,marginBottom:10}}>◆</div><div>{cloud?"Connecting…":"Loading…"}</div></div>
    </div>
  );

  return (
    <div style={S.root}>
      {toast && (
        <div style={{ position:"fixed",top:14,right:14,zIndex:9999,
          background:toast.type==="warn"?"#3B1A00":"#0A2A0A",
          border:`1px solid ${toast.type==="warn"?"#FF8C00":"#32CD32"}`,
          color:toast.type==="warn"?"#FFB347":"#5CDB5C",
          borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:700,
          boxShadow:"0 4px 32px rgba(0,0,0,.7)",maxWidth:360 }}>
          {toast.msg}
        </div>
      )}
      <div style={{ background:"#10111C",padding:"12px 18px",borderBottom:"1px solid #252636",display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ background:"#6C63FF",borderRadius:10,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff" }}>P</div>
        <div>
          <div style={{ fontWeight:900,fontSize:17,color:"#F0F0FF",letterSpacing:-.5 }}>PETHFULL</div>
          <div style={{ fontSize:10,color:"#555" }}>Staff Points · 1 pt = ₹{rate}</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <SyncDot synced={synced} syncing={syncing}/>
          {cloud && <button onClick={refresh} style={{ background:"none",border:"1px solid #252636",borderRadius:6,color:"#888",cursor:"pointer",fontSize:11,padding:"4px 8px" }}>↻ Refresh</button>}
          <div style={{ background:"#0E0F1A",border:"1px solid #252636",borderRadius:8,padding:"5px 12px",fontSize:11,color:"#666" }}>{WEEK_LABELS[cwi]?.slice(0,4)}</div>
        </div>
      </div>
      {!cloud && <div style={{ background:"#2B1A00",borderBottom:"1px solid #8B4A00",padding:"8px 18px",fontSize:12,color:"#FFB347" }}>⚠ Local mode — add Supabase env vars to sync across devices.</div>}
      <nav style={{ display:"flex",gap:3,padding:"10px 14px",background:"#10111C",borderBottom:"1px solid #252636",overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,
            background:tab===t.id?"#6C63FF":"transparent", color:tab===t.id?"#fff":"#666",
            display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap" }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:"18px 14px",maxWidth:940,margin:"0 auto" }}>
        {tab==="dashboard" && <Dashboard scoreboard={scoreboard} entries={entries} cwi={cwi} rate={rate} S={S}/>}
        {tab==="log"       && <LogEvent  staff={staff} rules={rules} cwi={cwi} rate={rate} onAdd={addEvent} S={S}/>}
        {tab==="paysheet"  && <PaySheet  scoreboard={scoreboard} entries={entries} rate={rate} payStatus={payStatus} onPayStatus={savePayStatus} S={S}/>}
        {tab==="scorecard" && <Scorecard scoreboard={scoreboard} rate={rate} S={S}/>}
        {tab==="history"   && <History   entries={entries} staff={staff} rate={rate} onDelete={delEntry} S={S}/>}
        {tab==="admin"     && <Admin     staff={staff} rules={rules} entries={entries} rate={rate}
                                         onSaveStaff={saveStaff} onSaveRules={saveRules} onSaveRate={saveRate}
                                         onDelEntry={delEntry} onResetAll={resetAll} S={S}/>}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ scoreboard, entries, cwi, rate, S }) {
  const wk    = entries.filter(e => e.weekIdx === cwi);
  const wkPts = r2(wk.reduce((a,e) => a+e.pts, 0));
  const top3  = scoreboard.slice(0,3);
  const neg   = scoreboard.filter(s => s.totalPts < 0);
  const teams = ["Kitchen","Service","Cleaning","Packing"].map(t => ({
    t, pts: r2(scoreboard.filter(s=>s.team===t).reduce((a,s)=>a+s.totalPts,0)),
    n: scoreboard.filter(s=>s.team===t).length,
  }));
  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>Dashboard</h1><p style={S.sub}>Live overview · syncs across all devices</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
        {[
          {l:"This Week Events",v:wk.length,         c:"#6C63FF"},
          {l:"This Week ₹",     v:(wkPts>=0?"+":"")+fmt(wkPts*rate), c:wkPts>=0?"#5CDB5C":"#FF6B6B"},
          {l:"Total Entries",   v:entries.length,     c:"#5BB8FF"},
          {l:"On Negative",     v:neg.length,         c:neg.length>0?"#FF6B6B":"#5CDB5C"},
        ].map(s=>(
          <div key={s.l} style={{...S.card,textAlign:"center",padding:"14px 10px",marginBottom:0}}>
            <div style={{fontSize:26,fontWeight:900,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:"#555",marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Team Points & Earnings</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          {teams.map(({t,pts,n})=>{
            const c=TC[t]||{bg:"#1A1A1A",txt:"#aaa",brd:"#333"};
            return (
              <div key={t} style={{background:c.bg,border:`1px solid ${c.brd}`,borderRadius:10,padding:"12px 14px"}}>
                <TeamChip team={t}/>
                <div style={{fontSize:22,fontWeight:900,color:pts>=0?"#5CDB5C":"#FF6B6B",margin:"8px 0 2px"}}>{fmtP(pts)} pts</div>
                <div style={{fontSize:12,color:"#888"}}>{pts>=0?"+":""}{fmt(pts*rate)} · {n} members</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:12,color:"#FFD700",marginBottom:12}}>⭐ Top Performers</div>
          {top3.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
              <div style={{width:22,fontWeight:900,fontSize:14,textAlign:"center",color:["#FFD700","#C0C0C0","#CD7F32"][i]}}>{i+1}</div>
              <Avt name={s.name} team={s.team} sz={30}/>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#E0E0F0"}}>{s.name}</div><TeamChip team={s.team} sm/></div>
              <div style={{textAlign:"right"}}><PtsBadge pts={s.totalPts}/><div style={{fontSize:10,color:"#555",marginTop:2}}>{fmt(Math.abs(s.totalRupees))}</div></div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:12,color:"#FF6B6B",marginBottom:12}}>⚠ Needs Attention</div>
          {neg.length===0
            ? <div style={{fontSize:12,color:"#555",textAlign:"center",padding:"20px 0"}}>All staff positive 🎉</div>
            : neg.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
                <Avt name={s.name} team={s.team} sz={30}/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#E0E0F0"}}>{s.name}</div><TeamChip team={s.team} sm/></div>
                <PtsBadge pts={s.totalPts}/>
              </div>
            ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:10}}>Recent Events</div>
        {entries.length===0 && <div style={{fontSize:12,color:"#555",textAlign:"center",padding:20}}>No events yet.</div>}
        {[...entries].reverse().slice(0,10).map((e,i)=>(
          <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #1E1F2E",fontSize:12}}>
            <CatChip cat={e.eventCat}/>
            <div style={{flex:1,color:"#D0D0EE",fontWeight:600}}>{e.eventType}</div>
            {e.source && <span style={{background:"#1A1A2E",borderRadius:4,padding:"1px 6px",fontSize:10,color:"#666"}}>{e.source}</span>}
            <span style={{fontSize:10,color:"#444"}}>{WEEK_LABELS[e.weekIdx]?.slice(0,4)}</span>
            <PtsBadge pts={e.pts}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LOG EVENT ────────────────────────────────────────────────────────────────
function LogEvent({ staff, rules, cwi, rate, onAdd, S }) {
  const [wi,   setWi]  = useState(cwi);
  const [evt,  setEvt] = useState("");
  const [sid,  setSid] = useState("");
  const [src,  setSrc] = useState("");
  const [qty,  setQty] = useState(1);   // NEW: number of reviews/events
  const [busy, setBusy]= useState(false);

  const sel      = rules.find(r => r.type === evt);
  const needs    = sel?.target === "Named Staff";
  const ids      = sel ? getAffectedStaff(sel, sid, staff) : [];
  const aff      = staff.filter(s => ids.includes(s.id));
  const isNamed  = sel?.target === "Named Staff";
  const perPerson= sel ? r2(calcPerPersonPts(sel.pts, ids.length, isNamed) * qty) : 0;
  const totalPool= sel ? r2(sel.pts * qty) : 0;
  const ok       = evt && (!needs || sid) && src && qty >= 1;

  const go = async () => {
    if (!ok) return;
    setBusy(true);
    await onAdd(sel, sid, wi, src, qty);
    setEvt(""); setSid(""); setSrc(""); setQty(1);
    setBusy(false);
  };

  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>Log Event</h1>
        <p style={S.sub}>Set quantity for multiple reviews · team total divided equally · 2 decimal precision</p></div>
      <div style={S.card}>
        {/* Row 1: Week + Source */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={S.lbl}>Week</label>
            <select style={S.sel} value={wi} onChange={e=>setWi(+e.target.value)}>
              {WEEK_LABELS.map((l,i)=><option key={i} value={i}>{l}</option>)}
            </select></div>
          <div><label style={S.lbl}>Source / Platform</label>
            <select style={S.sel} value={src} onChange={e=>setSrc(e.target.value)}>
              <option value="">Select source…</option>
              {SOURCES.map(s=><option key={s}>{s}</option>)}
            </select></div>
        </div>

        {/* Row 2: Event + Quantity */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 120px",gap:12,marginBottom:14}}>
          <div><label style={S.lbl}>Event Type</label>
            <select style={S.sel} value={evt} onChange={e=>{setEvt(e.target.value);setSid("");setQty(1);}}>
              <option value="">Select event…</option>
              {rules.map(r=><option key={r.type} value={r.type}>
                {r.type}  (Total: {r.pts>0?"+":""}{r.pts} pts = {fmt(Math.abs(r.pts*rate))})
              </option>)}
            </select></div>
          <div>
            <label style={S.lbl}>Quantity</label>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{...S.btn("ghost"),padding:"10px 14px",fontSize:16,lineHeight:1}}>−</button>
              <input style={{...S.inp,textAlign:"center",fontWeight:800,fontSize:18,padding:"10px 6px"}}
                type="number" min="1" max="100" value={qty}
                onChange={e=>setQty(Math.max(1,Math.min(100,+e.target.value||1)))}/>
              <button onClick={()=>setQty(q=>Math.min(100,q+1))} style={{...S.btn("pri"),padding:"10px 14px",fontSize:16,lineHeight:1}}>＋</button>
            </div>
          </div>
        </div>

        {needs && (
          <div style={{marginBottom:14}}>
            <label style={S.lbl}>Staff Name (required)</label>
            <select style={S.sel} value={sid} onChange={e=>setSid(e.target.value)}>
              <option value="">Select staff member…</option>
              {staff.map(s=><option key={s.id} value={s.id}>{s.name} — {s.team}</option>)}
            </select>
          </div>
        )}

        {/* Preview */}
        {sel && (
          <div style={{background:"#0E0F1A",border:"1px solid #2E2F3E",borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
              <CatChip cat={sel.cat}/>
              <span style={{fontSize:12,color:"#888"}}>→ <b style={{color:"#D0D0EE"}}>{sel.target}</b></span>
              {qty > 1 && <span style={{background:"#6C63FF22",border:"1px solid #6C63FF",borderRadius:6,padding:"1px 8px",fontSize:11,color:"#A09AFF",fontWeight:700}}>×{qty} events</span>}
              <span style={{fontSize:12,color:"#888"}}>Pool: <b style={{color:sel.pts>=0?"#5CDB5C":"#FF6B6B"}}>{fmtP(totalPool)} pts ({fmt(Math.abs(totalPool*rate))})</b></span>
            </div>
            {aff.length > 0 ? (
              <>
                <div style={{background:sel.pts>=0?"#0A2A0A":"#2A0A0A",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                  <div style={{fontSize:13,color:sel.pts>=0?"#5CDB5C":"#FF6B6B",fontWeight:800,marginBottom:3}}>
                    {isNamed
                      ? `Full ${fmtP(totalPool)} pts (${fmt(Math.abs(totalPool*rate))}) → ${aff[0]?.name} only`
                      : `${fmtP(totalPool)} pts ÷ ${aff.length} staff = ${fmtP(perPerson)} pts (${fmt(Math.abs(perPerson*rate))}) each`
                    }
                  </div>
                  {!isNamed && qty > 1 && <div style={{fontSize:11,color:"#888"}}>{qty} events × {fmtP(r2(sel.pts/aff.length))} = {fmtP(perPerson)} pts per person</div>}
                  {!isNamed && <div style={{fontSize:11,color:"#888"}}>Total pool {fmt(Math.abs(totalPool*rate))} shared equally</div>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {aff.map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,background:"#141520",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                      <Avt name={s.name} team={s.team} sz={18}/><span style={{color:"#D0D0EE"}}>{s.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : needs && !sid ? (
              <div style={{fontSize:12,color:"#666"}}>↑ Select a staff member above</div>
            ) : null}
          </div>
        )}

        <button style={{...S.btn("pri"),width:"100%",fontSize:15,padding:12,opacity:ok?1:.4}}
          disabled={!ok||busy} onClick={go}>
          {busy?"Saving…":`✓ Log ${qty > 1 ? qty+"× " : ""}Event & Apply Points`}
        </button>
      </div>
    </div>
  );
}

// ─── PAY SHEET (with Paid/Pending toggle) ─────────────────────────────────────
function PaySheet({ scoreboard, entries, rate, payStatus, onPayStatus, S }) {
  const [wi, setWi] = useState(getCurrentWeek());

  const wkE   = entries.filter(e => e.weekIdx === wi);
  const sheet = scoreboard.map(s => {
    const mine = wkE.filter(e => e.staffId === s.id);
    const pts  = r2(mine.reduce((a,e)=>a+e.pts,0));
    const key  = `${s.id}_${wi}`;
    return { ...s, wkPts:pts, wkRupees:r2(pts*rate), wkEvents:mine.length, payKey:key,
             isPaid: payStatus[key] === "paid" };
  }).sort((a,b)=>b.wkRupees-a.wkRupees);

  const totalPay  = r2(sheet.reduce((a,s)=>a+(s.wkRupees>0?s.wkRupees:0),0));
  const totalDed  = r2(sheet.reduce((a,s)=>a+(s.wkRupees<0?Math.abs(s.wkRupees):0),0));
  const paidCount = sheet.filter(s=>s.isPaid).length;
  const paidAmt   = r2(sheet.filter(s=>s.isPaid&&s.wkRupees>0).reduce((a,s)=>a+s.wkRupees,0));
  const pendingAmt= r2(sheet.filter(s=>!s.isPaid&&s.wkRupees>0).reduce((a,s)=>a+s.wkRupees,0));

  const togglePay = (key, current) => {
    const updated = { ...payStatus, [key]: current ? "pending" : "paid" };
    onPayStatus(updated);
  };

  const markAllPaid = () => {
    const updated = { ...payStatus };
    sheet.filter(s=>s.wkRupees>0).forEach(s=>{ updated[s.payKey]="paid"; });
    onPayStatus(updated);
  };

  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>Pay Sheet</h1><p style={S.sub}>Mark payments as Paid or Pending</p></div>

      {/* Week selector + summary cards */}
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={S.lbl}>Week</label>
          <select style={S.sel} value={wi} onChange={e=>setWi(+e.target.value)}>
            {WEEK_LABELS.map((l,i)=><option key={i} value={i}>{l}</option>)}
          </select>
        </div>
        <div style={{...S.card,marginBottom:0,padding:"12px 16px",textAlign:"center",minWidth:120}}>
          <div style={{fontSize:18,fontWeight:900,color:"#5CDB5C"}}>{fmt(totalPay)}</div>
          <div style={{fontSize:10,color:"#555"}}>Total to pay</div>
        </div>
        <div style={{...S.card,marginBottom:0,padding:"12px 16px",textAlign:"center",minWidth:120}}>
          <div style={{fontSize:18,fontWeight:900,color:"#5BB8FF"}}>{fmt(paidAmt)}</div>
          <div style={{fontSize:10,color:"#555"}}>✓ Paid ({paidCount})</div>
        </div>
        <div style={{...S.card,marginBottom:0,padding:"12px 16px",textAlign:"center",minWidth:120}}>
          <div style={{fontSize:18,fontWeight:900,color:"#FFB347"}}>{fmt(pendingAmt)}</div>
          <div style={{fontSize:10,color:"#555"}}>⏳ Pending</div>
        </div>
        <div style={{...S.card,marginBottom:0,padding:"12px 16px",textAlign:"center",minWidth:120}}>
          <div style={{fontSize:18,fontWeight:900,color:"#FF6B6B"}}>{fmt(totalDed)}</div>
          <div style={{fontSize:10,color:"#555"}}>Deductions</div>
        </div>
      </div>

      {/* Mark all paid button */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <button style={{...S.btn("grn"),fontSize:12,padding:"6px 16px"}} onClick={markAllPaid}>
          ✓ Mark All Paid
        </button>
      </div>

      <div style={S.card}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"2px solid #252636"}}>
              {["#","Staff","Team","Events","Points","Rupees","Deduction","Payment"].map(h=>(
                <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#555",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sheet.map((s,i)=>{
                const isPos  = s.wkRupees > 0;
                const isNeg  = s.wkRupees < 0;
                const rowBg  = s.isPaid?"#081A12": isNeg?"#1A0808": isPos?"#081208":"transparent";
                return (
                  <tr key={s.id} style={{borderBottom:"1px solid #1A1B2A",background:rowBg}}>
                    <td style={{padding:"9px 10px",color:"#555",fontSize:11}}>{i+1}</td>
                    <td style={{padding:"9px 10px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Avt name={s.name} team={s.team} sz={26}/>
                        <div><div style={{fontWeight:700,color:"#E0E0F0",fontSize:13}}>{s.name}</div><div style={{fontSize:10,color:"#555"}}>{s.role}</div></div>
                      </div>
                    </td>
                    <td style={{padding:"9px 10px"}}><TeamChip team={s.team} sm/></td>
                    <td style={{padding:"9px 10px",color:"#888",textAlign:"center"}}>{s.wkEvents}</td>
                    <td style={{padding:"9px 10px"}}><PtsBadge pts={s.wkPts}/></td>
                    <td style={{padding:"9px 10px",fontWeight:800,color:isPos?"#5CDB5C":"#555",fontSize:13}}>
                      {isPos ? fmt(s.wkRupees) : "—"}
                    </td>
                    <td style={{padding:"9px 10px",fontWeight:800,color:isNeg?"#FF6B6B":"#555",fontSize:13}}>
                      {isNeg ? fmt(s.wkRupees) : "—"}
                    </td>
                    <td style={{padding:"9px 10px"}}>
                      {isPos ? (
                        <button onClick={()=>togglePay(s.payKey, s.isPaid)}
                          style={{ border:"none",cursor:"pointer",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,
                            background: s.isPaid?"#0A3A1A":"#7A6000",
                            color: s.isPaid?"#5CDB5C":"#FFD700" }}>
                          {s.isPaid ? "✓ Paid" : "⏳ Pending"}
                        </button>
                      ) : isNeg ? (
                        <span style={{fontSize:11,color:"#FF6B6B",fontWeight:700}}>Deduct</span>
                      ) : (
                        <span style={{fontSize:11,color:"#555"}}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SCORECARD ────────────────────────────────────────────────────────────────
function Scorecard({ scoreboard, rate, S }) {
  const [filter, setFilter] = useState("All");
  const list    = filter==="All" ? scoreboard : scoreboard.filter(s=>s.team===filter);
  const maxPts  = Math.max(scoreboard[0]?.totalPts||1, 1);
  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>Scorecard</h1><p style={S.sub}>All-time ranking — points & earnings</p></div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["All","Kitchen","Service","Cleaning","Packing"].map(t=>(
          <button key={t} style={{...S.btn(filter===t?"pri":"ghost"),padding:"6px 14px",fontSize:12}} onClick={()=>setFilter(t)}>{t}</button>
        ))}
      </div>
      <div style={S.card}>
        {list.map(s=>{
          const rank = scoreboard.indexOf(s)+1;
          const pct  = Math.max(0,Math.min(100,(s.totalPts/maxPts)*100));
          return (
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #1E1F2E"}}>
              <div style={{width:28,textAlign:"center",fontWeight:900,fontSize:14,color:rank<=3?["#FFD700","#C0C0C0","#CD7F32"][rank-1]:"#3A3A4A"}}>{rank}</div>
              <Avt name={s.name} team={s.team} sz={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:"#E0E0F0",marginBottom:2}}>{s.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}><TeamChip team={s.team} sm/><span style={{fontSize:10,color:"#555"}}>{s.role}</span></div>
                <div style={{background:"#1A1B2A",borderRadius:4,height:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:s.totalPts>=0?"#6C63FF":"#8B0000",borderRadius:4,transition:"width .6s"}}/>
                </div>
              </div>
              <div style={{textAlign:"right",minWidth:90}}>
                <PtsBadge pts={s.totalPts}/>
                <div style={{fontSize:11,fontWeight:700,color:s.totalRupees>=0?"#5CDB5C":"#FF6B6B",marginTop:4}}>{s.totalRupees>=0?"+":""}{fmt(s.totalRupees)}</div>
                <div style={{fontSize:10,color:"#444"}}>{s.count} events</div>
              </div>
            </div>
          );
        })}
        {list.length===0 && <div style={{textAlign:"center",color:"#555",padding:24}}>No staff in this team.</div>}
      </div>
    </div>
  );
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function History({ entries, staff, rate, onDelete, S }) {
  const [q,setQ]=useState(""); const [fw,setFw]=useState(""); const [fc,setFc]=useState(""); const [del,setDel]=useState(null);
  const list = [...entries].reverse().filter(e=>{
    const nm=staff.find(s=>s.id===e.staffId)?.name||"";
    return (!q||e.eventType.toLowerCase().includes(q.toLowerCase())||nm.toLowerCase().includes(q.toLowerCase())||(e.source||"").toLowerCase().includes(q.toLowerCase()))
      && (!fw||e.weekIdx===+fw) && (!fc||e.eventCat===fc);
  });
  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>History</h1><p style={S.sub}>{entries.length} records — delete wrong entries here</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 120px 130px",gap:10,marginBottom:14}}>
        <input style={S.inp} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
        <select style={S.sel} value={fw} onChange={e=>setFw(e.target.value)}>
          <option value="">All weeks</option>
          {WEEK_LABELS.map((l,i)=><option key={i} value={i}>{l.slice(0,4)}</option>)}
        </select>
        <select style={S.sel} value={fc} onChange={e=>setFc(e.target.value)}>
          <option value="">All types</option>
          <option value="Positive">Positive</option>
          <option value="Negative">Negative</option>
          <option value="Bonus">Bonus</option>
        </select>
      </div>
      <div style={S.card}>
        {list.length===0 && <div style={{textAlign:"center",color:"#555",padding:24}}>No records match.</div>}
        {list.map((e,i)=>{
          const nm   = staff.find(s=>s.id===e.staffId)?.name||e.staffId;
          const team = staff.find(s=>s.id===e.staffId)?.team;
          return (
            <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 0",borderBottom:"1px solid #1E1F2E",flexWrap:"wrap"}}>
              <CatChip cat={e.eventCat}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:"#E0E0F0",fontSize:13}}>{e.eventType}</div>
                <div style={{display:"flex",gap:7,alignItems:"center",marginTop:2,flexWrap:"wrap"}}>
                  {team && <TeamChip team={team} sm/>}
                  <span style={{fontSize:11,color:"#888"}}>{nm}</span>
                  {e.source && <span style={{background:"#1A1B2A",borderRadius:4,padding:"1px 6px",fontSize:10,color:"#666"}}>{e.source}</span>}
                  <span style={{fontSize:10,color:"#444"}}>{WEEK_LABELS[e.weekIdx]?.slice(0,4)} · {new Date(e.loggedAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <PtsBadge pts={e.pts}/>
                <div style={{fontSize:10,color:e.pts>=0?"#5CDB5C":"#FF6B6B",marginTop:2,fontWeight:700}}>{e.pts>=0?"+":""}{fmt(e.pts*rate)}</div>
              </div>
              {del===e.id
                ? <div style={{display:"flex",gap:5}}>
                    <button style={{...S.btn("red"),padding:"4px 10px",fontSize:11}} onClick={()=>{onDelete(e.id);setDel(null);}}>Confirm</button>
                    <button style={{...S.btn("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setDel(null)}>Cancel</button>
                  </div>
                : <button style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16,padding:"2px 6px"}} onClick={()=>setDel(e.id)}>✕</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({ staff, rules, entries, rate, onSaveStaff, onSaveRules, onSaveRate, onDelEntry, onResetAll, S }) {
  const [at,setAt]=useState("staff");
  const [eS,setES]=useState(null); const [eE,setEE]=useState(null);
  const [ns,setNs]=useState({name:"",role:"",team:"Kitchen"});
  const [ne,setNe]=useState({type:"",cat:"Positive",pts:0,target:"Full Team"});
  const [newRate,setNewRate]=useState(rate);
  const [conf,setConf]=useState(false);
  const TO=["Kitchen","Service","Cleaning","Packing"];
  const TG=["Full Team","Kitchen Team","Service Team","Packing Team","Cleaning Team","Kitchen + Service","Named Staff"];
  const CA=["Positive","Negative","Bonus"];

  return (
    <div>
      <div style={{marginBottom:18}}><h1 style={S.h1}>Admin Panel</h1><p style={S.sub}>All changes sync to cloud instantly</p></div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[{id:"staff",l:"👥 Staff"},{id:"events",l:"📋 Rules"},{id:"rate",l:"₹ Rate"},{id:"danger",l:"⚠ Danger"}]
          .map(t=><button key={t.id} style={{...S.btn(at===t.id?"pri":"ghost"),padding:"7px 14px",fontSize:12}} onClick={()=>setAt(t.id)}>{t.l}</button>)}
      </div>

      {at==="staff" && <>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Add Staff Member</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
            <div><label style={S.lbl}>Name</label><input style={S.inp} value={ns.name} onChange={e=>setNs(p=>({...p,name:e.target.value}))} placeholder="Full name"/></div>
            <div><label style={S.lbl}>Role</label><input style={S.inp} value={ns.role} onChange={e=>setNs(p=>({...p,role:e.target.value}))} placeholder="e.g. Chef"/></div>
            <div><label style={S.lbl}>Team</label><select style={S.sel} value={ns.team} onChange={e=>setNs(p=>({...p,team:e.target.value}))}>{TO.map(t=><option key={t}>{t}</option>)}</select></div>
            <button style={S.btn("pri")} onClick={()=>{ if(!ns.name.trim()) return; onSaveStaff([...staff,{id:"S"+Date.now(),name:ns.name,role:ns.role,team:ns.team}]); setNs({name:"",role:"",team:"Kitchen"}); }}>Add</button>
          </div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Staff ({staff.length})</div>
          {staff.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E1F2E"}}>
              <Avt name={s.name} team={s.team} sz={30}/>
              {eS===s.id
                ? <InlineStaffEdit s={s} TO={TO} S={S} onSave={v=>{onSaveStaff(staff.map(x=>x.id===s.id?v:x));setES(null);}} onCancel={()=>setES(null)}/>
                : <><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#E0E0F0"}}>{s.name}</div><div style={{fontSize:11,color:"#555"}}>{s.role} · <TeamChip team={s.team} sm/></div></div>
                  <button style={{...S.btn("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setES(s.id)}>Edit</button>
                  <button style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16}} onClick={()=>onSaveStaff(staff.filter(x=>x.id!==s.id))}>✕</button></>}
            </div>
          ))}
        </div>
      </>}

      {at==="events" && <>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Add Event Rule</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 70px 1fr auto",gap:10,alignItems:"end"}}>
            <div><label style={S.lbl}>Name</label><input style={S.inp} value={ne.type} onChange={e=>setNe(p=>({...p,type:e.target.value}))} placeholder="Event name"/></div>
            <div><label style={S.lbl}>Category</label><select style={S.sel} value={ne.cat} onChange={e=>setNe(p=>({...p,cat:e.target.value}))}>{CA.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={S.lbl}>Points</label><input style={S.inp} type="number" value={ne.pts} onChange={e=>setNe(p=>({...p,pts:+e.target.value}))}/></div>
            <div><label style={S.lbl}>Who Gets Points</label><select style={S.sel} value={ne.target} onChange={e=>setNe(p=>({...p,target:e.target.value}))}>{TG.map(t=><option key={t}>{t}</option>)}</select></div>
            <button style={{...S.btn("pri"),marginTop:18}} onClick={()=>{ if(!ne.type.trim()) return; onSaveRules([...rules,{...ne}]); setNe({type:"",cat:"Positive",pts:0,target:"Full Team"}); }}>Add</button>
          </div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Rules ({rules.length})</div>
          {rules.map((r,idx)=>(
            <div key={r.type+idx} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #1E1F2E",flexWrap:"wrap"}}>
              {eE===idx
                ? <InlineEventEdit r={r} CA={CA} TG={TG} S={S} onSave={v=>{onSaveRules(rules.map((x,i)=>i===idx?v:x));setEE(null);}} onCancel={()=>setEE(null)}/>
                : <><CatChip cat={r.cat}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#E0E0F0"}}>{r.type}</div><div style={{fontSize:11,color:"#555"}}>→ {r.target}</div></div>
                  <PtsBadge pts={r.pts}/>
                  <button style={{...S.btn("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setEE(idx)}>Edit</button>
                  <button style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16}} onClick={()=>onSaveRules(rules.filter((_,i)=>i!==idx))}>✕</button></>}
            </div>
          ))}
        </div>
      </>}

      {at==="rate" && (
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:6}}>Points → Rupee Rate</div>
          <div style={{fontSize:12,color:"#666",marginBottom:16}}>Current: 1 pt = ₹{rate}</div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end",maxWidth:280}}>
            <div style={{flex:1}}><label style={S.lbl}>₹ per Point</label>
              <input style={S.inp} type="number" min="0.1" step="0.5" value={newRate} onChange={e=>setNewRate(+e.target.value)}/></div>
            <button style={S.btn("grn")} onClick={()=>onSaveRate(newRate)}>Save</button>
          </div>
        </div>
      )}

      {at==="danger" && <>
        <div style={{...S.card,border:"1px solid #8B0000"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#FF4444",marginBottom:8}}>⚠ Danger Zone</div>
          <div style={{background:"#140606",borderRadius:10,padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:12,color:"#FF8A80",marginBottom:6}}>Clear All Entries ({entries.length} records)</div>
            <div style={{fontSize:11,color:"#666",marginBottom:12}}>Staff and rules are kept. This also clears cloud data.</div>
            {conf
              ? <div style={{display:"flex",gap:8}}>
                  <button style={S.btn("red")} onClick={()=>{onResetAll();setConf(false);}}>Yes, delete all</button>
                  <button style={S.btn("ghost")} onClick={()=>setConf(false)}>Cancel</button>
                </div>
              : <button style={S.btn("red")} onClick={()=>setConf(true)}>Clear All Entries</button>}
          </div>
          <div style={{background:"#0E0F1A",borderRadius:10,padding:16}}>
            <div style={{fontWeight:700,fontSize:12,color:"#888",marginBottom:6}}>Reset to Factory Defaults</div>
            <div style={{fontSize:11,color:"#666",marginBottom:12}}>Restores 15 original staff + 10 original rules.</div>
            <button style={S.btn("ghost")} onClick={()=>{onSaveStaff(STAFF_DEFAULT);onSaveRules(EVENTS_DEFAULT);}}>Reset Defaults</button>
          </div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:13,color:"#F0F0FF",marginBottom:12}}>Audit Log (last 60)</div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {entries.length===0 && <div style={{fontSize:12,color:"#555",textAlign:"center",padding:16}}>No entries.</div>}
            {[...entries].reverse().slice(0,60).map((e,i)=>{
              const nm=staff.find(s=>s.id===e.staffId)?.name||e.staffId;
              return (
                <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #1A1B2A",fontSize:11,color:"#666",flexWrap:"wrap"}}>
                  <span style={{fontFamily:"monospace",color:"#444",fontSize:10}}>{new Date(e.loggedAt).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                  <span style={{color:"#D0D0EE"}}>{e.eventType}</span>
                  <span>→ {nm}</span>
                  <span style={{marginLeft:"auto"}}><PtsBadge pts={e.pts}/></span>
                  <button style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:12,padding:"0 4px"}} onClick={()=>onDelEntry(e.id)}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </>}
    </div>
  );
}

function InlineStaffEdit({ s, TO, S, onSave, onCancel }) {
  const [v,setV]=useState({...s});
  return (
    <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.inp,flex:1,minWidth:100}} value={v.name} onChange={e=>setV(p=>({...p,name:e.target.value}))} placeholder="Name"/>
      <input style={{...S.inp,flex:1,minWidth:80}} value={v.role} onChange={e=>setV(p=>({...p,role:e.target.value}))} placeholder="Role"/>
      <select style={{...S.sel,minWidth:110}} value={v.team} onChange={e=>setV(p=>({...p,team:e.target.value}))}>{TO.map(t=><option key={t}>{t}</option>)}</select>
      <button style={{...S.btn("pri"),padding:"6px 12px",fontSize:11}} onClick={()=>onSave(v)}>Save</button>
      <button style={{...S.btn("ghost"),padding:"6px 12px",fontSize:11}} onClick={onCancel}>Cancel</button>
    </div>
  );
}

function InlineEventEdit({ r, CA, TG, S, onSave, onCancel }) {
  const [v,setV]=useState({...r});
  return (
    <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.inp,flex:2,minWidth:130}} value={v.type} onChange={e=>setV(p=>({...p,type:e.target.value}))} placeholder="Event name"/>
      <select style={{...S.sel,minWidth:90}} value={v.cat} onChange={e=>setV(p=>({...p,cat:e.target.value}))}>{CA.map(c=><option key={c}>{c}</option>)}</select>
      <input style={{...S.inp,width:65}} type="number" value={v.pts} onChange={e=>setV(p=>({...p,pts:+e.target.value}))}/>
      <select style={{...S.sel,minWidth:120}} value={v.target} onChange={e=>setV(p=>({...p,target:e.target.value}))}>{TG.map(t=><option key={t}>{t}</option>)}</select>
      <button style={{...S.btn("pri"),padding:"6px 12px",fontSize:11}} onClick={()=>onSave(v)}>Save</button>
      <button style={{...S.btn("ghost"),padding:"6px 12px",fontSize:11}} onClick={onCancel}>Cancel</button>
    </div>
  );
}
