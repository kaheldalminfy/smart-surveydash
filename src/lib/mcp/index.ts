import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMeTool from "./tools/get-me";
import listProgramsTool from "./tools/list-programs";
import listSurveysTool from "./tools/list-surveys";
import listComplaintsTool from "./tools/list-complaints";
import listRecommendationsTool from "./tools/list-recommendations";

// The OAuth issuer MUST be the direct Supabase host — the project ref is the
// only value that stays stable across environments.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "quality-hss-mcp",
  title: "Quality HSS",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Quality HSS academic quality-management platform. " +
    "Use `get_me` to see the caller's roles, `list_programs` to discover program IDs, " +
    "then `list_surveys`, `list_complaints`, or `list_recommendations` (all respect the caller's row-level permissions).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMeTool, listProgramsTool, listSurveysTool, listComplaintsTool, listRecommendationsTool],
});
