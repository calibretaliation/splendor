# Splendor Mobile App: Detailed Design Summary

## Product Vision
- Faithful, mobile-first reconstruction of Splendor for four connected players sharing a single always-on room, mixing humans and AI as needed.
- Provides frictionless entry (name-only authentication) and quick restarts so casual groups can drop in and play from separate devices.
- Targets ages 10+ with approachable pixel-art styling, light narrative flavor, and accessibility features to support broad audiences.

## Player Lifecycle & Room Management
- Launch flow prompts a unique alphanumeric explorer name (3–15 chars) and immediately attempts to reserve one of four seats; duplicate names or full rooms surface blocking errors.
- The first successfully connected human becomes host, gains control of winning score (10–20, default 15), and can kick players to back-fill with AI or restart the lobby.
- Remaining seats auto-fill with themed AI captains; if a human disconnects, their slot hot-swaps to AI while preserving board state for later reconnection using the same name.

## Lobby Configuration
- Lobby presents a 2x2 grid of player/AI cards revealing avatars, strategy archetypes, and status messages such as “Awaiting Explorer.”
- Rules side panel reiterates mission parameters: gem counts (7 per color, 5 gold), noble tiles (5 for four players), target prestige, and turn order randomization toggle.
- Host can adjust the energy-bar slider for winning score, initiate the match once four seats are filled, or trigger room reset to clear the roster.

## Gameplay Mechanics & Rules Enforcement
- Setup routines shuffle three development decks, lay out four face-up cards per tier, place five nobles, and stock gem piles according to Splendor rules.
- On each turn a player may: take three distinct gems, take two same-colored gems (requires ≥4 in pile), reserve a card (gaining gold if available), or purchase a card from the tableau or personal reserve using tokens and bonuses.
- Engine enforces inventory limits (max 10 gems, max 3 reserved cards), validates affordability against permanent bonuses, auto-awards nobles immediately, and checks post-turn victory against the configured prestige threshold.
- Players can undo within their active turn before confirming actions; invalid attempts surface clear error messaging.

## User Interface Experience
- Portrait-focused layout keeps the central market and gem clusters in view, with persistent opponent panels along the edges showing gem counts, bonuses, and score badges without extra taps.
- Personal control dock at the bottom exposes owned cards, private reserved slots, noble trophies, and action buttons (Harvest Crystals, Secure Probe, Deploy Module, Undo) rendered in glowing pixel art.
- Reserved cards remain hidden from other players (displaying classified placeholders) yet expand into detailed popups for the owner with zoomable art, costs, and lore callouts.
- Additional views include a pixelated launch form, lobby space-station vignette, post-game celebration with statistics, and guided tutorial slides illustrating core actions.

## AI Systems
- Four personas: Aggressive focuses on high-value card purchases, Defensive prioritizes blocking reserves and noble progress, Balanced adapts probabilistically by phase, and Random provides unpredictable baseline behavior.
- Strategies can execute through two interchangeable engines: deterministic local heuristics with light lookahead or remote LLM prompts that ingest serialized game state and return validated actions.
- Decision logs capture chosen actions and rationales for debugging; configuration files expose tunable weights, probabilities, and strategy versions for A/B testing or live balancing.

## Networking & Synchronization
- Real-time updates travel via WebSockets; the authoritative server validates every move before broadcasting updated board, gem pools, reserves, and scores to clients.
- Optimistic UI is encouraged client-side to mask latency, rolling back only if the server rejects an action.
- Auto-save checkpoints after each turn guard against network drops, allowing reconnecting humans to resume seamlessly with their previous state.

## System Architecture & Data Models
- Client: Flutter application leveraging custom pixel-art assets, touch input handling, and animation tooling (e.g., Rive/Flare) for 60 FPS interactions.
- Server: Node.js service exposing REST endpoints for setup plus Socket.io channels for gameplay, housing the core rules engine and AI execution layer.
- Persistence: Firebase Realtime Database stores room snapshot (players, board layout, gem counts, nobles, current turn, winning score, game phase).
- Domain models: Player (identifiers, human flag, gem inventory, bonuses, reserves, bought cards, score), Card (id, level, gem cost map, bonus color, prestige), Noble (requirements, prestige), and Board encapsulating tableau and token pools.

## Non-Functional Commitments
- Performance: Sub-second response per action, animation budget at 60 FPS, minimal computation (<3s) for AI turns; caching of common evaluations to stay within mobile constraints.
- Reliability: Graceful handling of disconnects, reconnection logic keyed by player name, and server-side anti-cheat validation of all moves.
- Accessibility & Localization: High-contrast palettes, optional color-blind symbol overlays, scalable typography, and voice-over friendly component labels; shipping in English with future expansion hooks.
- Security & Privacy: Minimal personal data storage (name only), validation to prevent duplicate names or tampering with gem counts, and secure transport for API traffic.

## Development Roadmap & Risks
- Phase 1 Prototype: Implement single-device simulation of rules, card market, and scoring with stubbed AI.
- Phase 2 Multiplayer: Add backend synchronization, lobby flow, reconnection handling, and live AI turns.
- Phase 3 Polish: Integrate full pixel-art UI, animations, soundscape, tutorial, and configurable AI strategies.
- Phase 4 Testing & Launch: Execute unit and integration coverage for rules/AI, conduct internal alpha and broader beta rounds, refine balance, and prepare store submissions.
- Key risks: Network latency impacting feel (mitigate with optimistic updates), AI dominance or weakness (address via telemetry-driven tuning), and asset production bandwidth for pixel art (plan asset pipeline early).
