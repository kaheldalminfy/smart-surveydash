# Architecture
- Annual report AI runs in an authenticated Edge Function with program-role checks; only aggregate survey results are sent to the model to avoid exposing individual responses.
- Keep AI-proposed annual recommendations separate from tracked recommendations so proposals do not imply approved or completed actions.
- Public survey reads, question reads, and atomic submissions use the same manual-status gate in the database, so access and submission cannot diverge.