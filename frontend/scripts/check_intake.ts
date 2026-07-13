import {
  emptyAnswers,
  firstTurn,
  nextTurn,
  type BotTurn,
  type IntakeAnswers,
} from "../src/features/onboarding/intakeScript";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

let cur: BotTurn = firstTurn("Alex");
let ans: IntakeAnswers = emptyAnswers();

function step(value: string) {
  const r = nextTurn(cur, value, ans);
  ans = r.answers;
  if (r.crisisExit) throw new Error("unexpected crisis");
  assert(r.turn, "expected next turn");
  cur = r.turn;
}

step("ready");
step("anxiety, sleep");
assert(ans.concerns.includes("anxiety"), "concerns");
step("a few months");
step("sleep better");
step("no");
step("no");
step("ok");
assert(cur.id === "phq", "phq");

for (let i = 0; i < 9; i += 1) step("1");
assert(cur.id === "gad_intro", `expected gad_intro got ${cur.id}`);
step("ok");
for (let i = 0; i < 7; i += 1) step("1");
assert(cur.id === "summary", "summary");
assert(ans.phq9.length === 9 && ans.gad7.length === 7, "lengths");

// free-text style labels still map via Number for script when passing "1"
assert(ans.phq9.every((n) => n === 1), "phq values");

cur = firstTurn("Alex");
ans = emptyAnswers();
let r = nextTurn(cur, "ready", ans);
cur = r.turn!;
r = nextTurn(cur, "anxiety", r.answers);
cur = r.turn!;
r = nextTurn(cur, "weeks", r.answers);
cur = r.turn!;
r = nextTurn(cur, "goal", r.answers);
cur = r.turn!;
r = nextTurn(cur, "yes", r.answers);
assert(r.crisisExit, "crisis");

console.log("intakeScript checks passed");
