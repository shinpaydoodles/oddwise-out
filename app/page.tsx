"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Copy, Crown, Flame, Heart, HelpCircle, Link2, Plus, RotateCcw, Sparkles, Trophy, Users, Zap } from "lucide-react";

type Tier = "common" | "unusual" | "rare" | "legendary";
type Player = { id: string; name: string; color: number; doubleUsed: boolean; answered: boolean };
type Answer = { playerId: string; playerName: string; color: number; answer: { raw: string; tier: Tier | null; status: "valid" | "pending" | "invalid"; doubleDown: boolean } | null; points: number };
type Game = { code: string; mode: "remote" | "local"; phase: "lobby" | "answer" | "reveal" | "finished"; isHost: boolean; myId: string; questionCount: number; timeLimit: number; roundNumber: number; players: Player[]; prompt: { category: string; question: string } | null; deadline: number | null; seat: number; answers: Answer[] | null; myAnswer: { raw: string; doubleDown: boolean } | null; standings: { id: string; name: string; color: number; score: number }[] };
type Session = { code: string; token: string };
const colors = ["#c9ff61", "#ff8d69", "#a88cff", "#64d9f1", "#ffcd64", "#ff80be", "#81e6ba", "#ffae54", "#8db2ff", "#e0d3ff"];
const tiers: Record<Tier, string> = { common: "COMMON", unusual: "UNUSUAL", rare: "RARE", legendary: "LEGENDARY" };

function Logo() { return <div className="brand"><span className="brand-icon">O<i /></span><span>ODDWISE <b>OUT</b></span></div>; }
function Avatar({ name, color }: { name: string; color: number }) { return <span className="avatar" style={{ backgroundColor: colors[color % colors.length] }}>{name.slice(0, 1).toUpperCase()}</span>; }

function SupportDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && event.shiftKey && document.activeElement === closeRef.current) { event.preventDefault(); downloadRef.current?.focus(); }
      else if (event.key === "Tab" && !event.shiftKey && document.activeElement === downloadRef.current) { event.preventDefault(); closeRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
  return <div className="support-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-title" aria-describedby="support-note">
      <div className="support-dialog-top"><div><span className="support-eyebrow"><Heart size={14} fill="currentColor" /> A LITTLE BOOST</span><h2 id="support-title">Support the creator</h2></div><button ref={closeRef} className="support-close" aria-label="Close support dialog" onClick={onClose}>×</button></div>
      <div className="qr-frame"><img src="/gcash-support-qr.jpg" alt="GCash InstaPay donation QR code for Shinpay" width="659" height="1280" /></div>
      <div className="support-copy"><p className="pixel-text">ENJOYING THE GAME?<br />SUPPORT SHINPAYDOODLES.</p><p id="support-note">Tips are optional. Thanks for playing and keeping the odd ideas coming.</p><a ref={downloadRef} className="support-download" href="/gcash-support-qr.jpg" download="oddwise-out-gcash-qr.jpg">Save QR image</a></div>
    </section>
  </div>;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"remote" | "local">("remote");
  const [questionCount, setQuestionCount] = useState(6);
  const [joinCode, setJoinCode] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [answer, setAnswer] = useState("");
  const [doubleDown, setDoubleDown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [rules, setRules] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportButtonRef = useRef<HTMLButtonElement>(null);
  const closeSupport = useCallback(() => {
    setSupportOpen(false);
    const url = new URL(location.href);
    if (url.searchParams.has("support")) { url.searchParams.delete("support"); history.replaceState({}, "", url.pathname + url.search); }
    requestAnimationFrame(() => supportButtonRef.current?.focus());
  }, []);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try { const saved = localStorage.getItem("oddwise-session"); if (saved) setSession(JSON.parse(saved)); } catch { /* unavailable storage */ }
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    if (room) { setJoinCode(room.toUpperCase()); setTab("join"); }
    if (params.get("support") === "1") setSupportOpen(true);
  }, []);
  const refresh = useCallback(async (current: Session) => {
    try {
      const response = await fetch(`/api/game?code=${encodeURIComponent(current.code)}`, { cache: "no-store", headers: { "x-player-token": current.token } });
      const data = await response.json() as Game;
      if (response.ok) setGame(data);
      else if (response.status === 403 || response.status === 404) { setSession(null); setGame(null); localStorage.removeItem("oddwise-session"); }
    } catch { /* brief connection loss */ }
  }, []);
  useEffect(() => { if (!session) return; refresh(session); const poll = setInterval(() => refresh(session), 1700); return () => clearInterval(poll); }, [session, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  useEffect(() => { setAnswer(""); setDoubleDown(false); }, [game?.roundNumber, game?.seat]);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(session ?? {}), ...extra }) });
      const data = await response.json() as (Game & { error?: string; token?: string; code?: string; state?: Game });
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      if (data.token) {
        const next = { code: data.code as string, token: data.token as string };
        setSession(next); localStorage.setItem("oddwise-session", JSON.stringify(next));
        history.replaceState({}, "", action === "join" ? `/?room=${next.code}` : "/");
      }
      setGame(data.state ?? data);
      if (action === "addPlayer") setNewPlayer("");
      if (action === "submit") setAnswer("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  function leave() { setSession(null); setGame(null); setMessage(""); localStorage.removeItem("oddwise-session"); history.replaceState({}, "", "/"); }
  async function copy() {
    if (!game) return;
    try { await navigator.clipboard.writeText(`${location.origin}/?room=${game.code}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setMessage("Copy the room code above to invite players."); }
  }

  const seconds = game?.deadline ? Math.max(0, Math.ceil((game.deadline - now) / 1000)) : 0;
  const currentPlayer = game?.players[game.seat];
  const self = game?.players.find(player => player.id === game.myId);
  const canAnswer = game?.phase === "answer" && (game.mode === "local" ? !!game.deadline : !game.myAnswer);
  const answered = game?.players.filter(player => player.answered).length ?? 0;
  const answers = [...(game?.answers ?? [])].sort((a, b) => b.points - a.points);

  return <div className="site-shell"><div className="glow glow-a" /><div className="glow glow-b" />
    <header className="topbar"><Logo /><div className="topbar-right"><span>THE RARE ANSWER GAME</span><button aria-label="How to play" className="help-button" onClick={() => setRules(true)}><HelpCircle size={20} /></button></div></header>
    {!game ? <main className="landing"><section className="hero"><div className="eyebrow"><span className="live-dot" /> THINK FAST. THINK DIFFERENT.</div><h1>THINK ODD.<br /><em>STAND OUT.</em></h1><p>The answer everyone knows? That&apos;s the trap. Find the clever one nobody else will think of and climb to the top.</p><div className="hero-stats"><span><Users size={18} /> 3–10 players</span><span><Zap size={18} /> Quick rounds</span><span><Trophy size={18} /> One winner</span></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="art-card art-back"><small>ANIMAL THAT STARTS WITH F</small><strong>FOX</strong><span>COMMON +20</span></div><div className="art-card art-front"><small>ANIMAL THAT STARTS WITH F</small><strong>FOSSA</strong><span>RARE +65</span><i>✳</i></div><div className="art-spark">✦</div></div></section>
      <section className="entry-panel"><div className="entry-tabs"><button className={tab === "create" ? "selected" : ""} onClick={() => { setTab("create"); setMessage(""); }}>Create a room</button><button className={tab === "join" ? "selected" : ""} onClick={() => { setTab("join"); setMessage(""); }}>Join a room</button></div><div className="entry-content"><div className="card-kicker"><Sparkles size={16} /> {tab === "create" ? "YOUR GAME, YOUR RULES" : "GOT AN INVITE?"}</div><h2>{tab === "create" ? "Start something good." : "Jump into the game."}</h2><label className="field-label" htmlFor="player-name">YOUR NAME</label><input id="player-name" className="text-input" placeholder="What should we call you?" maxLength={20} value={name} onChange={event => setName(event.target.value)} />
      {tab === "create" ? <><div className="field-label spaced">HOW ARE YOU PLAYING?</div><div className="mode-grid"><button className={`mode-card ${mode === "remote" ? "mode-active" : ""}`} onClick={() => setMode("remote")}><span><Link2 size={22} /></span><strong>Many devices</strong><small>Everyone joins with a code</small></button><button className={`mode-card ${mode === "local" ? "mode-active" : ""}`} onClick={() => setMode("local")}><span><RotateCcw size={22} /></span><strong>One device</strong><small>Pass it around each turn</small></button></div><div className="question-picker"><div><span className="field-label">QUESTIONS</span><small>3 to 12 random prompts</small></div><div className="stepper"><button aria-label="Fewer questions" onClick={() => setQuestionCount(Math.max(3, questionCount - 1))}>−</button><b>{questionCount}</b><button aria-label="More questions" onClick={() => setQuestionCount(Math.min(12, questionCount + 1))}>+</button></div></div><button className="primary-button" disabled={busy || !name.trim()} onClick={() => call("create", { name, mode, questionCount })}>CREATE ROOM <ArrowRight size={21} /></button></>
      : <><label className="field-label spaced" htmlFor="room-code">ROOM CODE</label><input id="room-code" className="text-input code-input" placeholder="ABC123" maxLength={6} value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={event => { if (event.key === "Enter") call("join", { name, code: joinCode }); }} /><p className="entry-hint">Ask your host for their six-character code.</p><button className="primary-button" disabled={busy || !name.trim() || joinCode.length !== 6} onClick={() => call("join", { name, code: joinCode })}>JOIN ROOM <ArrowRight size={21} /></button></>}{message && <div className="error-message" role="alert">{message}</div>}</div></section><div className="landing-footer"><span>01 / ANSWER</span><span>02 / REVEAL</span><span>03 / OUTSMART</span></div></main>
    : <main className="game-layout"><div className="game-topline"><div className="room-meta"><span className="live-dot" /> {game.phase === "lobby" ? "LOBBY" : game.phase === "finished" ? "FINAL RESULTS" : `ROUND ${game.roundNumber} OF ${game.questionCount}`}<span className="meta-divider">/</span><span>{game.mode === "local" ? "ONE DEVICE" : "MANY DEVICES"}</span></div><div className="game-actions"><button className="code-button" onClick={copy}># {game.code} {copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="text-button" onClick={leave}>Leave</button></div></div>
      {game.phase === "lobby" && <div className="lobby-grid"><section className="lobby-main"><div className="section-kicker"><span /> THE LINEUP</div><h1>THE MORE,<br /><em>THE MERRIER.</em></h1><p className="section-subtitle">Bring your sharpest minds. The host can start once at least three players are in.</p><div className="lobby-count"><Users size={20} /> <strong>{game.players.length} / 10</strong><span>PLAYERS READY</span></div><div className="roster-grid">{game.players.map((player, index) => <div className="roster-card" key={player.id}><Avatar name={player.name} color={player.color} /><span>{player.name}</span>{index === 0 && <Crown size={17} />}</div>)}{game.players.length < 10 && <div className="roster-placeholder"><Plus size={22} /><span>OPEN SPOT</span></div>}</div></section><aside className="lobby-side"><div className="side-card accent-card"><div className="card-kicker">ROOM CODE</div><div className="big-code">{game.code}</div><p>{game.mode === "remote" ? "Share the code or invite link with your crew." : "Everyone takes a private turn on this device."}</p>{game.mode === "remote" && <button className="outline-button" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "COPIED!" : "COPY INVITE LINK"}</button>}</div>{game.mode === "local" && game.isHost && <div className="side-card"><div className="card-kicker">ADD A PLAYER</div><div className="inline-form"><input className="text-input" placeholder="Player name" maxLength={20} value={newPlayer} onChange={event => setNewPlayer(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && newPlayer.trim()) call("addPlayer", { name: newPlayer }); }} /><button aria-label="Add player" disabled={busy || !newPlayer.trim() || game.players.length >= 10} onClick={() => call("addPlayer", { name: newPlayer })}><Plus size={22} /></button></div></div>}<div className="side-card"><div className="card-kicker">MATCH SETTINGS</div><div className="setting-row"><span>Questions</span><b>{game.questionCount}</b></div><div className="setting-row"><span>Answer time</span><b>{game.timeLimit}s</b></div><div className="setting-row"><span>Categories</span><b>Random</b></div></div>{game.isHost ? <button className="primary-button" disabled={busy || game.players.length < 3} onClick={() => call("start")}>START GAME <ArrowRight size={21} /></button> : <div className="waiting-note"><span className="pulse-ring" /> Waiting for the host to start…</div>}</aside></div>}
      {game.phase === "answer" && <div className="round-grid"><section className="round-main"><div className="round-progress"><span style={{ width: `${game.roundNumber / game.questionCount * 100}%` }} /></div><div className="round-header"><div className="section-kicker"><span /> {game.prompt?.category}</div><div className={`timer ${seconds <= 10 && game.deadline ? "timer-urgent" : ""}`}><Clock3 size={18} /> {game.deadline ? `${seconds}s` : "READY"}</div></div><div className="question-number">QUESTION {String(game.roundNumber).padStart(2, "0")}</div><h1 className="question-title">{game.prompt?.question}</h1><p className="question-tip">A valid answer is good. One nobody else thinks of is better.</p>{game.mode === "local" && !game.deadline ? <div className="handoff-card"><div className="handoff-symbol">↗</div><div className="card-kicker">PASS THE DEVICE TO</div><h2>{currentPlayer?.name}</h2><p>Keep your answer secret. Your {game.timeLimit}-second timer starts when you tap ready.</p><button className="primary-button" disabled={busy} onClick={() => call("ready")}>I&apos;M READY <ArrowRight size={20} /></button></div> : canAnswer ? <form className="answer-form" onSubmit={event => { event.preventDefault(); if (answer.trim()) call("submit", { answer, doubleDown }); }}><label className="field-label" htmlFor="answer">YOUR ANSWER {game.mode === "local" ? `— ${currentPlayer?.name.toUpperCase()}` : ""}</label><div className="answer-input-wrap"><input id="answer" className="answer-input" autoComplete="off" autoFocus placeholder="Type your best answer…" maxLength={80} value={answer} onChange={event => setAnswer(event.target.value)} /><span>↵</span></div><button type="button" className={`double-toggle ${doubleDown ? "double-selected" : ""}`} disabled={game.mode === "local" ? currentPlayer?.doubleUsed : self?.doubleUsed} onClick={() => setDoubleDown(!doubleDown)}><Flame size={17} /><strong>DOUBLE DOWN</strong><span>{(game.mode === "local" ? currentPlayer?.doubleUsed : self?.doubleUsed) ? "Already used" : doubleDown ? "ON — 2× rarity points" : "One shot per match"}</span></button><button className="primary-button answer-submit" disabled={busy || !answer.trim()} type="submit">LOCK IT IN <ArrowRight size={20} /></button></form> : <div className="locked-card"><span><Check size={29} /></span><h2>ANSWER LOCKED.</h2><p><strong>{game.myAnswer?.raw}</strong> is in. Waiting for everyone else to finish.</p></div>}</section><aside className="round-side"><div className="side-card"><div className="card-kicker">IN THE ARENA <span>{answered}/{game.players.length}</span></div><div className="player-list">{game.players.map((player, index) => <div className={`player-row ${game.mode === "local" && index === game.seat ? "current-player" : ""}`} key={player.id}><Avatar name={player.name} color={player.color} /><span>{player.name}</span>{player.answered ? <Check size={18} className="answered-check" /> : game.mode === "local" && index === game.seat ? <span className="playing-dot" /> : null}</div>)}</div></div><div className="tip-card"><Sparkles size={20} /><strong>ODD TIP</strong><p>Think past the first answer that comes to mind. Everyone else thought of it too.</p></div></aside></div>}
      {(game.phase === "reveal" || game.phase === "finished") && <div className="reveal-grid"><section className="reveal-main"><div className="section-kicker"><span /> {game.phase === "finished" ? "THE FINAL STANDINGS" : `ROUND ${game.roundNumber} REVEAL`}</div><h1>{game.phase === "finished" ? <>WE HAVE A <em>WINNER.</em></> : <>ODD ANSWERS.<br /><em>BIG POINTS.</em></>}</h1><p className="section-subtitle">{game.prompt?.question}</p>{game.phase === "finished" && <div className="winner-banner"><Crown size={34} /><div><small>{game.standings.filter(player => player.score === game.standings[0]?.score).length > 1 ? "ODDWISE OUT CO-CHAMPIONS" : "ODDWISE OUT CHAMPION"}</small><strong>{game.standings.filter(player => player.score === game.standings[0]?.score).map(player => player.name).join(" & ")}</strong></div><span>{game.standings[0]?.score} PTS</span></div>}<div className="answers-heading"><span>THE ANSWERS</span><span>POINTS</span></div><div className="answer-reveal-list">{answers.map((item, index) => <div className="reveal-card" key={item.playerId} style={{ animationDelay: `${index * 65}ms` }}><Avatar name={item.playerName} color={item.color} /><div className="reveal-detail"><small>{item.playerName}</small><strong>{item.answer?.raw ?? "No answer"}</strong><div className="reveal-badges">{item.answer?.status === "valid" && item.answer.tier && <span className={`rarity rarity-${item.answer.tier}`}>{tiers[item.answer.tier]}</span>}{item.answer?.status === "pending" && <span className="rarity rarity-pending">NEEDS REVIEW</span>}{item.answer?.status === "invalid" && <span className="rarity rarity-invalid">INVALID</span>}{item.answer?.doubleDown && <span className="rarity rarity-double"><Flame size={12} /> DOUBLE DOWN</span>}</div></div><div className={`reveal-points ${item.points < 0 ? "negative" : ""}`}>{item.points > 0 ? "+" : ""}{item.points}</div>{game.isHost && item.answer?.status === "pending" && <div className="review-controls"><button onClick={() => call("judge", { playerId: item.playerId, verdict: "invalid" })}>Invalid</button><select aria-label={`Rate ${item.playerName}'s answer`} defaultValue="" onChange={event => { if (event.target.value) call("judge", { playerId: item.playerId, verdict: event.target.value }); }}><option value="" disabled>Approve as…</option><option value="common">Common · 20</option><option value="unusual">Unusual · 40</option><option value="rare">Rare · 65</option><option value="legendary">Legendary · 90</option></select></div>}</div>)}</div>{game.isHost && game.phase === "reveal" && <button className="primary-button next-button" disabled={busy} onClick={() => call("next")}>{game.roundNumber >= game.questionCount ? "SEE FINAL RESULTS" : "NEXT QUESTION"} <ArrowRight size={21} /></button>}{!game.isHost && game.phase === "reveal" && <div className="waiting-note"><span className="pulse-ring" /> Waiting for the next question…</div>}</section><aside className="reveal-side"><div className="side-card scoreboard"><div className="card-kicker"><Trophy size={17} /> LEADERBOARD</div>{game.standings.map((player, index) => <div className="score-row" key={player.id}><span className="rank">{String(index + 1).padStart(2, "0")}</span><Avatar name={player.name} color={player.color} /><span className="score-name">{player.name}</span><strong>{player.score}</strong></div>)}</div><div className="tip-card"><Zap size={20} /><strong>SCORING</strong><p>Common 20 · Unusual 40 · Rare 65 · Legendary 90. A unique answer adds 20 points.</p></div></aside></div>}{message && <div className="toast-error" role="alert">{message}<button onClick={() => setMessage("")}>×</button></div>}</main>}
    <footer className="site-footer"><span>ODDWISE OUT © 2026</span><span>THINK ODD. STAND OUT.</span><button onClick={() => setRules(true)}>HOW TO PLAY →</button></footer>
    <button ref={supportButtonRef} className="support-fab" type="button" aria-label="Support the creator" aria-haspopup="dialog" aria-expanded={supportOpen} onClick={() => setSupportOpen(true)}><Heart size={17} fill="currentColor" /><span>Support creator</span></button>
    {supportOpen && <SupportDialog onClose={closeSupport} />}
    {rules && <div className="modal-backdrop" onClick={() => setRules(false)}><div className="rules-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setRules(false)} aria-label="Close rules">×</button><div className="section-kicker"><span /> THE RULES</div><h2>THINK ODD.<br /><em>SCORE BIG.</em></h2><div className="rule"><span>01</span><div><strong>GET YOUR CREW</strong><p>Play with 3–10 people on one device or with a room code on separate devices.</p></div></div><div className="rule"><span>02</span><div><strong>ANSWER THE PROMPT</strong><p>Each round draws a random category. Type a valid answer before the clock runs out.</p></div></div><div className="rule"><span>03</span><div><strong>BE RARE, BE UNIQUE</strong><p>Common answers get 20 points; legendary ones get 90. If nobody matches your answer, earn 20 more.</p></div></div><div className="rule"><span>04</span><div><strong>TAKE ONE BIG SWING</strong><p>Use Double Down once per match to double rarity points. An invalid Double Down costs 15 points.</p></div></div><p className="rule-note">The host can review valid answers missing from the curated answer bank before advancing.</p><button className="primary-button" onClick={() => setRules(false)}>GOT IT <ArrowRight size={20} /></button></div></div>}
  </div>;
}
