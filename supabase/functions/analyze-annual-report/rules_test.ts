import { canAnalyzeProgram } from "./rules.ts";
Deno.test("coordinator can analyze only assigned program", () => {
  if (!canAnalyzeProgram([{ role: "coordinator", program_id: "law" }], "law")) throw Error("Assigned access denied");
  if (canAnalyzeProgram([{ role: "coordinator", program_id: "law" }], "business")) throw Error("Other program allowed");
});
Deno.test("program supervisor can analyze only assigned program", () => {
  if (!canAnalyzeProgram([{ role: "program_manager", program_id: "law" }], "law")) throw Error("Assigned access denied");
  if (canAnalyzeProgram([{ role: "program_manager", program_id: "law" }], "business")) throw Error("Other program allowed");
});
Deno.test("system administrator can analyze all programs", () => {
  if (!canAnalyzeProgram([{ role: "admin", program_id: null }], "business")) throw Error("Admin denied");
});