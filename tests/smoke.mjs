const base = process.env.GAME_URL ?? "http://127.0.0.1:3000";

async function post(action, body = {}) {
  const response = await fetch(`${base}/api/game`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${action}: ${JSON.stringify(data)}`);
  return data;
}
async function get(code, token) {
  const response = await fetch(`${base}/api/game?code=${code}`, { headers: { "x-player-token": token } });
  const data = await response.json();
  if (!response.ok) throw new Error(`get: ${JSON.stringify(data)}`);
  return data;
}
function assert(value, message) { if (!value) throw new Error(message); }

const host = await post("create", { name: "Ada", mode: "remote", questionCount: 3 });
const key = { code: host.code, token: host.token };
const ben = await post("join", { code: host.code, name: "Ben" });
const cam = await post("join", { code: host.code, name: "Cam" });
assert(host.state.players.length === 1, "Host lobby should start with one player.");
const start = await post("start", key);
assert(start.phase === "answer" && start.players.length === 3, "Remote match should start with three players.");
assert((await get(host.code, ben.token)).answers === null, "Answers must stay hidden during the round.");
await post("submit", { ...key, answer: "Zargle" });
await post("submit", { code: host.code, token: ben.token, answer: "Zargle" });
const reveal = await post("submit", { code: host.code, token: cam.token, answer: "Quorble" });
assert(reveal.phase === "reveal", "All submissions should trigger a reveal.");
assert(reveal.answers.every(item => item.answer?.status === "pending"), "Unlisted answers should require review.");
for (const player of reveal.players) {
  await post("judge", { ...key, playerId: player.id, verdict: player.name === "Cam" ? "legendary" : "rare" });
}
const scored = await get(host.code, host.token);
const byName = Object.fromEntries(scored.answers.map(item => [item.playerName, item.points]));
assert(byName.Ada === 65 && byName.Ben === 65 && byName.Cam === 110, `Incorrect collision/unique scoring: ${JSON.stringify(byName)}`);
const next = await post("next", key);
assert(next.phase === "answer" && next.roundNumber === 2, "Host should advance to the next question.");

const local = await post("create", { name: "One", mode: "local", questionCount: 3 });
const localKey = { code: local.code, token: local.token };
await post("addPlayer", { ...localKey, name: "Two" });
await post("addPlayer", { ...localKey, name: "Three" });
const localStart = await post("start", localKey);
assert(localStart.deadline === 0 && localStart.seat === 0, "One-device turn should wait for the player to be ready.");
for (let seat = 0; seat < 3; seat++) {
  const ready = await post("ready", localKey);
  assert(ready.deadline > Date.now() && ready.seat === seat, "Ready should start the current player's timer.");
  const submitted = await post("submit", { ...localKey, answer: `Unknown${seat}` });
  assert(seat === 2 ? submitted.phase === "reveal" : submitted.seat === seat + 1 && submitted.deadline === 0, "Turn should pass privately or reveal after the last player.");
}
console.log("Smoke test passed: remote room, hidden answers, scoring, host review, and one-device handoff.");
