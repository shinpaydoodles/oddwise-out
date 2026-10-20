import { neon } from "@neondatabase/serverless";
import { expireRoom, finalizeRound, makeDeck, startRound, viewRoom, type Answer, type Room } from "../../../lib/game";
import { normalizeAnswer, type Tier } from "../../../lib/prompts";

export const dynamic = "force-dynamic";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), value => alphabet[value % alphabet.length]).join("");
const id = () => crypto.randomUUID();
const cleanName = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 20) : "";
const error = (message: string, status = 400) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
const ok = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });
const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? neon(databaseUrl) : null;
function database() { if (!db) throw new Error("DATABASE_URL is not configured."); return db; }

async function readRoom(roomCode: string): Promise<{ room: Room; version: number } | null> {
  const rows = await database()`SELECT data, version FROM rooms WHERE code = ${roomCode}`;
  const row = rows[0];
  return row ? { room: row.data as Room, version: row.version as number } : null;
}

async function changeRoom(roomCode: string, change: (room: Room) => string | void) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const found = await readRoom(roomCode);
    if (!found) return { error: "Room not found." };
    const message = change(found.room);
    if (message) return { error: message };
    const updated = await database()`UPDATE rooms SET data = ${JSON.stringify(found.room)}::jsonb, version = version + 1 WHERE code = ${roomCode} AND version = ${found.version} RETURNING code`;
    if (updated.length === 1) return { room: found.room };
  }
  return { error: "The room was busy. Please try again." };
}

function playerFor(room: Room, token: string) { return room.players.find(player => player.token === token); }
function authentic(room: Room, token: string) { return playerFor(room, token) ? undefined : "This device is not in the room. Join again."; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomCode = (url.searchParams.get("code") ?? "").trim().toUpperCase();
  const token = request.headers.get("x-player-token") ?? "";
  if (!roomCode || !token) return error("Missing room or player key.");
  const found = await readRoom(roomCode);
  if (!found) return error("Room not found.", 404);
  if (authentic(found.room, token)) return error("This device is not in the room. Join again.", 403);
  let room = found.room;
  const round = room.rounds[room.roundIndex];
  if (room.phase === "answer" && round?.deadline && Date.now() >= round.deadline) {
    const changed = await changeRoom(roomCode, current => { expireRoom(current, Date.now()); });
    if (changed.error) return error(changed.error);
    room = changed.room!;
  }
  return ok(viewRoom(room, playerFor(room, token)!));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return error("Invalid request."); }
  const action = body.action;
  if (action === "create") {
    const name = cleanName(body.name);
    const mode = body.mode;
    const questionCount = Number(body.questionCount);
    if (!name) return error("Enter a player name.");
    if (mode !== "remote" && mode !== "local") return error("Choose a device mode.");
    if (!Number.isInteger(questionCount) || questionCount < 3 || questionCount > 12) return error("Choose 3–12 questions.");
    const player = { id: id(), token: id(), name, color: 0, doubleUsed: false };
    const room: Room = { code: "", mode, phase: "lobby", hostId: player.id, questionCount, timeLimit: mode === "local" ? 25 : 35, players: [player], deck: makeDeck(), roundIndex: -1, rounds: [], createdAt: Date.now() };
    for (let attempt = 0; attempt < 8; attempt++) {
      room.code = code();
      const inserted = await database()`INSERT INTO rooms (code, version, data, created_at) VALUES (${room.code}, 0, ${JSON.stringify(room)}::jsonb, NOW()) ON CONFLICT (code) DO NOTHING RETURNING code`;
      if (inserted.length === 1) return ok({ code: room.code, token: player.token, state: viewRoom(room, player) });
    }
    return error("Could not create a room. Please try again.", 503);
  }
  const roomCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!roomCode) return error("Enter a room code.");
  if (action === "join") {
    const name = cleanName(body.name);
    if (!name) return error("Enter a player name.");
    const joining = { id: id(), token: id(), name, color: 0, doubleUsed: false };
    const result = await changeRoom(roomCode, room => {
      if (room.mode !== "remote") return "This is a one-device room.";
      if (room.phase !== "lobby") return "This match has already started.";
      if (room.players.length >= 10) return "This room is full.";
      if (room.players.some(player => player.name.toLowerCase() === name.toLowerCase())) return "That name is already taken.";
      joining.color = room.players.length % 10;
      room.players.push(joining);
    });
    if (result.error) return error(result.error);
    return ok({ code: roomCode, token: joining.token, state: viewRoom(result.room!, joining) });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const result = await changeRoom(roomCode, room => {
    const player = playerFor(room, token);
    if (!player) return "This device is not in the room. Join again.";
    const now = Date.now();
    expireRoom(room, now);
    if (action === "addPlayer") {
      if (room.hostId !== player.id || room.mode !== "local" || room.phase !== "lobby") return "Only the host can add players before the match.";
      const name = cleanName(body.name);
      if (!name) return "Enter a player name.";
      if (room.players.length >= 10) return "This room is full.";
      if (room.players.some(other => other.name.toLowerCase() === name.toLowerCase())) return "That name is already taken.";
      room.players.push({ id: id(), token: id(), name, color: room.players.length % 10, doubleUsed: false });
    } else if (action === "start") {
      if (room.hostId !== player.id || room.phase !== "lobby") return "Only the host can start the match.";
      if (room.players.length < 3) return "You need at least 3 players.";
      startRound(room, now);
    } else if (action === "ready") {
      if (room.hostId !== player.id || room.mode !== "local" || room.phase !== "answer") return "This turn is not ready.";
      const round = room.rounds[room.roundIndex];
      if (round.deadline) return "This turn has already started.";
      round.deadline = now + room.timeLimit * 1000;
    } else if (action === "submit") {
      if (room.phase !== "answer") return "This round is closed.";
      const round = room.rounds[room.roundIndex];
      const answering = room.mode === "local" ? room.players[round.seat] : player;
      if (room.mode === "local" && room.hostId !== player.id) return "Use the host device for this round.";
      if (room.mode === "local" && !round.deadline) return "Tap ready to start the turn.";
      if (round.answers[answering.id]) return "An answer is already locked in.";
      const raw = typeof body.answer === "string" ? body.answer.trim().replace(/\s+/g, " ").slice(0, 80) : "";
      if (!raw) return "Type an answer first.";
      const doubleDown = body.doubleDown === true;
      if (doubleDown && answering.doubleUsed) return "Double Down was already used.";
      const answer: Answer = { raw, canonical: normalizeAnswer(raw), tier: null, status: "pending", doubleDown };
      round.answers[answering.id] = answer;
      if (doubleDown) answering.doubleUsed = true;
      if (room.mode === "local") {
        if (round.seat < room.players.length - 1) {
          round.seat += 1;
          round.deadline = 0;
        } else finalizeRound(room, now);
      } else if (Object.keys(round.answers).length === room.players.length) finalizeRound(room, now);
    } else if (action === "next") {
      if (room.hostId !== player.id || room.phase !== "reveal") return "Only the host can move to the next round.";
      if (Object.values(room.rounds[room.roundIndex].answers).some(answer => answer.status === "pending")) return "Review all unlisted answers before moving on.";
      if (room.roundIndex + 1 >= room.questionCount) room.phase = "finished";
      else startRound(room, now);
    } else if (action === "judge") {
      if (room.hostId !== player.id || (room.phase !== "reveal" && room.phase !== "finished")) return "Only the host can review answers after the reveal.";
      const target = typeof body.playerId === "string" ? body.playerId : "";
      const answer = room.rounds[room.roundIndex]?.answers[target];
      if (!answer) return "Answer not found.";
      if (body.verdict === "invalid") { answer.status = "invalid"; answer.tier = null; }
      else if (["common", "unusual", "rare", "legendary"].includes(String(body.verdict))) {
        answer.status = "valid"; answer.tier = body.verdict as Tier;
      } else return "Choose a rarity or mark invalid.";
    } else return "Unknown action.";
  });
  if (result.error) return error(result.error);
  return ok(viewRoom(result.room!, playerFor(result.room!, token)!));
}
