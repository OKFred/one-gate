# Repository Guidance

Read `.agents/AGENTS.md` and the referenced global, workflow, backend and frontend guidance before changing this repository. Code under `server/` must also follow `server/AGENTS.md`.

## Text and line endings

- All text files must be UTF-8 without BOM and use LF line endings.
- Respect the existing root `.editorconfig` and `.gitattributes`; never introduce CRLF-only diffs.
- Run `git diff --check` before handoff and do not change global Git settings.
