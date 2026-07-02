# smarzban-skills — project overview

## Overview

This repo is a dual-tool plugin marketplace (`smarzban-skills`) holding the **agent-sdlc** SDLC
pipeline plugin and the **review-gate** review/audit plugin. This `specs/` tree applies agent-sdlc
to its own repo: features of the plugins themselves are shaped, gated, and built through the
pipeline they implement.

### Features

- **enforcement-spine** — a deterministic pipeline checker (`sdlc-check`) + terminal AC
  verification at ship, so agent-sdlc's mechanical guarantees are verified by code rather than
  asserted by the executing agent. (in progress)
