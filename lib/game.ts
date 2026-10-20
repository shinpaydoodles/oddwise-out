import { findEntry, normalizeAnswer, prompts, type Tier } from "./prompts";

export type Mode = "remote" | "local";
export type Phase = "lobby" | "answer" | "reveal" | "finished";
export type Player = { id: string; token: string; name: string; color: number; doubleUsed: boolean };
export type Answer = { raw: string; canonical: string; tier: Tier | null; status: "valid" | "pending" | "invalid"; doubleDown: boolean };
export type Round = { promptId: string; answers: Record<string, Answer>; deadline: number; seat: number; finishedAt?: number };
export type Room = { code: string; mode: Mode; phase: Phase; hostId: string; questionCount: number; timeLimit: number; players: Player[]; deck: string[]; roundIndex: number; rounds: Round[]; createdAt: number };

export const tierPoints: Record<Tier, number> = { common: 20, unusual: 40, rare: 65, legendary: 90 };

export function makeDeck() {
  const ids = prompts.map(prompt => prompt.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function currentPrompt(room: Room) {
  return prompts.find(prompt => prompt.id === room.rounds[room.roundIndex]?.promptId);
}

export function scoreRound(round: Round, playerId: string) {
  const answer = round.answers[playerId];
  if (!answer) return 0;
  if (answer.status !== "valid" || !answer.tier) return answer.status === "invalid" && answer.doubleDown ? -15 : 0;
  const collisions = Object.values(round.answers).filter(other => other.status === "valid" && other.canonical === answer.canonical).length;
  return tierPoints[answer.tier] * (answer.doubleDown ? 2 : 1) + (collisions === 1 ? 20 : 0);
}

export function scores(room: Room) {
  return room.players.map(player => ({
    id: player.id,
    name: player.name,
    color: player.color,
    score: room.rounds.filter(round => round.finishedAt).reduce((total, round) => total + scoreRound(round, player.id), 0),
  })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function finalizeRound(room: Room, now: number) {
  const round = room.rounds[room.roundIndex];
  const prompt = currentPrompt(room);
  if (!round || !prompt || round.finishedAt) return;
  for (const player of room.players) {
    const answer = round.answers[player.id];
    if (!answer) continue;
    const entry = findEntry(prompt, answer.raw);
    if (entry) {
      answer.canonical = normalizeAnswer(entry.answer);
      answer.tier = entry.tier;
      answer.status = "valid";
    } else {
      answer.status = "pending";
    }
  }
  round.finishedAt = now;
  room.phase = "reveal";
}

export function expireRoom(room: Room, now: number) {
  if (room.phase !== "answer") return false;
  const round = room.rounds[room.roundIndex];
  if (!round.deadline || now < round.deadline) return false;
  if (room.mode === "remote") {
    finalizeRound(room, now);
  } else if (round.seat < room.players.length - 1) {
    round.seat += 1;
    round.deadline = 0;
  } else {
    finalizeRound(room, now);
  }
  return true;
}

export function startRound(room: Room, now: number) {
  room.roundIndex += 1;
  room.rounds.push({ promptId: room.deck[room.roundIndex], answers: {}, deadline: room.mode === "local" ? 0 : now + room.timeLimit * 1000, seat: 0 });
  room.phase = "answer";
}

export function viewRoom(room: Room, player: Player) {
  const round = room.rounds[room.roundIndex];
  const prompt = currentPrompt(room);
  const revealed = room.phase === "reveal" || room.phase === "finished";
  return {
    code: room.code,
    mode: room.mode,
    phase: room.phase,
    isHost: player.id === room.hostId,
    myId: player.id,
    questionCount: room.questionCount,
    timeLimit: room.timeLimit,
    roundNumber: room.roundIndex + 1,
    players: room.players.map(({ id, name, color, doubleUsed }) => ({ id, name, color, doubleUsed, answered: !!round?.answers[id] })),
    prompt: prompt ? { id: prompt.id, category: prompt.category, question: prompt.question } : null,
    deadline: round?.deadline ?? null,
    seat: round?.seat ?? 0,
    answers: revealed && round ? room.players.map(p => ({ playerId: p.id, playerName: p.name, color: p.color, answer: round.answers[p.id] ?? null, points: scoreRound(round, p.id) })) : null,
    myAnswer: round?.answers[player.id] ? { raw: round.answers[player.id].raw, doubleDown: round.answers[player.id].doubleDown } : null,
    standings: scores(room),
  };
}
