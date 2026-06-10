/** Quick sanity test for the BM25 retrieval engine: npx tsx scripts/testRetrieval.ts */
import { searchKnowledge } from "../lib/retrieval/engine";
import { matchSkills } from "../lib/skills";

const queries = [
  "蛀牙 要不要洗牙",
  "white patch on tongue smoker",
  "bleeding gums when brushing",
  "how often scaling cleaning",
  "betel quid ulcer 3 weeks",
];

for (const q of queries) {
  const hits = searchKnowledge(q, 3);
  console.log(`\nQ: ${q}`);
  for (const h of hits) {
    console.log(
      `   ${h.normalized.toFixed(2)}  ${h.entry.id}  [${h.matchedTerms.slice(0, 5).join(", ")}]`
    );
  }
}

console.log("\nSkill matching:");
for (const q of ["should I quit betel?", "do I need scaling 洗牙", "what now after high risk result", "how to brush better"]) {
  const s = matchSkills(q, "patient", 1)[0];
  console.log(`   "${q}" → ${s?.name ?? "(none)"}`);
}
