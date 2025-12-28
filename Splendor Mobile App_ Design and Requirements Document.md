\# Splendor Mobile App: Design and Requirements Document

\#\# 1\. Introduction

\#\#\# 1.1 Purpose  
This document outlines the complete design and requirements for a mobile application implementing the board game \*Splendor\* for up to 4 players. The app supports a mix of human and AI players, with humans joining from their own devices (primarily smartphones). The design prioritizes a fully functional app covering all basic use cases, including game setup, multiplayer synchronization, gameplay mechanics, and user interface elements. It adheres to the rules of \*Splendor\* as described in the reference (https://www.dicebreaker.com/games/splendor/how-to/how-to-play-splendor-board-game), with customizations for configurability and simplicity.

\#\#\# 1.2 Scope  
\- \*\*Core Features\*\*: Multiplayer game for 4 players (0-4 humans, rest AI); single global room for simplicity; configurable winning score; AI with varied strategies.  
\- \*\*Platform\*\*: Mobile-first (iOS and Android), optimized for phones with responsive design for tablets.  
\- \*\*Exclusions\*\*: No multiple rooms; no offline single-player mode (all games are in the single room with AI filling slots); no in-app purchases; no advanced analytics or leaderboards.  
\- \*\*Assumptions\*\*: Players are in the same logical "room" via internet connectivity; a simple backend server handles synchronization. The app requires internet access for multiplayer.

\#\#\# 1.3 Target Audience  
\- Casual gamers familiar with \*Splendor\* or similar resource-management games.  
\- Groups of friends/family playing together remotely or in-person via devices.  
\- Ages 10+ (per original game rating).

\#\#\# 1.4 References  
\- Game Rules: https://www.dicebreaker.com/games/splendor/how-to/how-to-play-splendor-board-game  
\- UI Inspiration: Modern mobile games like Ticket to Ride or Catan apps (aesthetic, intuitive layouts).

\#\# 2\. Overview

\#\#\# 2.1 Game Mechanics Summary  
\*Splendor\* is a turn-based resource-collection game:  
\- \*\*Components\*\*:   
  \- Gem tokens (chips): 7 each of emerald (green), sapphire (blue), ruby (red), diamond (white), onyx (black); 5 gold (joker).  
  \- Development cards: 40 level 1, 30 level 2, 20 level 3; each with cost (gems), bonus (permanent gem), and prestige points.  
  \- Noble tiles: 3-5 (based on player count; for 4 players: 5 nobles).  
\- \*\*Player Actions per Turn\*\*:  
  \- Take 3 different gems.  
  \- Take 2 of the same gem (if 4+ available).  
  \- Reserve a card (take 1 gold if available) and hide it.  
  \- Buy a card using gems/bonuses.  
\- \*\*End Game\*\*: First player to reach the configurable winning score (default 15\) wins. Nobles award points automatically if conditions met.  
\- \*\*App-Specific\*\*: 4 players total; humans join via name registration; AI fills remaining slots with different strategies.

\#\#\# 2.2 High-Level System Flow  
1\. User opens app → Registers name → Joins single room if \<4 players.  
2\. If room full, display error and prevent access.  
3\. Lobby: Configure winning score; wait for 4 players (AI auto-fills if needed).  
4\. Game starts: Randomized setup; turns proceed clockwise.  
5\. Real-time synchronization: Updates to all devices.  
6\. Game ends: Display winner; option to restart (resets room).

\#\#\# 2.3 Key Use Cases  
\- \*\*User Registration and Joining\*\*: New user joins empty/full room.  
\- \*\*Game Setup\*\*: Configure score; AI assignment.  
\- \*\*Gameplay\*\*: Human turn (select actions); AI turn (automated); view public info.  
\- \*\*Synchronization\*\*: Handle disconnects/reconnects.  
\- \*\*Edge Cases\*\*: Player quits mid-game (replace with AI); invalid actions; tie in scores.  
\- \*\*Post-Game\*\*: View results; restart or exit.

\#\# 3\. Requirements

\#\#\# 3.1 Functional Requirements  
\#\#\#\# 3.1.1 User Authentication and Room Management  
\- FR1.1: Upon app launch, prompt user to enter a unique name (alphanumeric, 3-15 characters).  
\- FR1.2: Automatically attempt to join the single global room.  
  \- If \<4 players, assign slot and notify "Joined as Player X".  
  \- If 4 players, display "Room Full" and disable app access (close or loop to retry).  
\- FR1.3: Names must be unique in the room; prompt re-entry if duplicate.  
\- FR1.4: Support up to 4 humans; auto-fill remaining with AI (e.g., if 2 humans, add 2 AI).

\#\#\#\# 3.1.2 Lobby and Configuration  
\- FR2.1: In lobby (after joining), display current players (humans/AI) and wait for 4 total.  
\- FR2.2: Allow host (first joiner) to configure winning score (10-20 points, default 15).  
\- FR2.3: Start game automatically when 4 players ready or manually by host.  
\- FR2.4: Option for host to kick players (replace with AI) or restart room.

\#\#\#\# 3.1.3 Gameplay Mechanics  
\- FR3.1: Implement full \*Splendor\* rules:  
  \- Setup: Shuffle cards, select nobles (5 for 4 players), initial gems (7 per color, 5 gold).  
  \- Turns: Highlight current player; enforce action limits (max 10 gems, max 3 reserves).  
  \- Actions: Drag/drop for gems/cards; validate costs/bonuses.  
  \- Nobles: Auto-award if player meets gem bonuses.  
  \- End: Check after each turn; announce winner.  
\- FR3.2: AI Players:  
  \- Assign different strategies (e.g., AI1: Aggressive buying; AI2: Reserve-focused; AI3: Balanced; AI4: Random).  
  \- AI turns simulate in 1-3 seconds; notify "AI X is thinking...".  
\- FR3.3: Real-time Updates: Push notifications for turn changes, actions, and game state.  
\- FR3.4: Handle Disconnects: If human disconnects, replace with AI; allow reconnect with same name to resume.

\#\#\#\# 3.1.4 User Interface Interactions  
\- FR4.1: Always display all players' public info: Chips (gems), bought cards (with bonuses/points), prestige score.  
\- FR4.2: Hide reserved cards from others; show only to owner.  
\- FR4.3: Central board: Show available gems, face-up cards (4 per level), nobles.  
\- FR4.4: Player's hand: Show own reserves, gems, bought cards.  
\- FR4.5: Touch-based controls: Tap to select action, drag gems/cards.  
\- FR4.6: Undo last action (human only, within turn).  
\- FR4.7: Chat: Simple text chat for players.

\#\#\#\# 3.1.5 Post-Game and Utilities  
\- FR5.1: Display end screen with scores, winner, and replay stats (e.g., cards bought).  
\- FR5.2: Option to restart (clears room, re-join).  
\- FR5.3: Help/Tutorial: In-app rules summary with interactive demo.  
\- FR5.4: Settings: Sound on/off, notifications, theme (light/dark).

\#\#\# 3.2 Non-Functional Requirements  
\- NFR1: Performance: Smooth on mid-range phones; \<1s latency for actions; support 60FPS animations.  
\- NFR2: Usability: Intuitive UI; accessibility (color-blind modes, large text).  
\- NFR3: Security: Basic name validation; prevent cheating (server-side validation).  
\- NFR4: Reliability: Handle network issues; auto-save state every turn.  
\- NFR5: Scalability: Single room limits to 4; no need for high traffic.  
\- NFR6: Aesthetics: Modern design with gem-themed colors (vibrant but not overwhelming); animations for actions (e.g., card flip).  
\- NFR7: Platforms: Cross-platform (use Flutter/React Native); min iOS 14, Android 10\.  
\- NFR8: Localization: English only (expandable).  
\- NFR9: Testing: Unit tests for mechanics; integration for multiplayer; user testing for UI.

\#\# 4\. System Architecture

\#\#\# 4.1 High-Level Architecture  
\- \*\*Client-Side\*\*: Mobile app (Flutter for cross-platform).  
\- \*\*Server-Side\*\*: Simple Node.js backend with WebSockets (e.g., Socket.io) for real-time sync; Firebase for database (room state, player data).  
\- \*\*Data Flow\*\*:  
  \- Client → Server: Send actions (e.g., take gems).  
  \- Server → Clients: Broadcast validated state updates.  
\- \*\*Components\*\*:  
  \- Frontend: UI layers (lobby, board, player panels).  
  \- Backend: Game engine (rules enforcement), AI module.  
  \- Database: Store room state (JSON: players, board, turns).

\#\#\# 4.2 Technology Stack  
\- \*\*Frontend\*\*: Flutter (Dart) for UI; animations via Flare/Rive.  
\- \*\*Backend\*\*: Node.js; Express for API; Socket.io for real-time.  
\- \*\*Database\*\*: Firebase Realtime DB (simple, scalable for one room).  
\- \*\*AI\*\*: Custom scripts in JS; strategies as decision trees.  
\- \*\*Deployment\*\*: Heroku/AWS for server; App Store/Google Play for clients.

\#\#\# 4.3 Data Models  
\- \*\*Player\*\*: { id: string, name: string, isHuman: bool, gems: {color: int}, reserves: \[Card\], bought: \[Card\], score: int, bonuses: {color: int} }  
\- \*\*Board\*\*: { gems: {color: int}, cards: {level1: \[Card\], level2: \[Card\], level3: \[Card\]}, nobles: \[Noble\] }  
\- \*\*Card\*\*: { id: string, level: int, cost: {color: int}, bonusColor: string, points: int }  
\- \*\*Noble\*\*: { id: string, requirements: {color: int}, points: int }  
\- \*\*Room\*\*: { players: \[Player\], board: Board, currentTurn: int, winningScore: int, state: enum(setup, playing, ended) }

\#\# 5\. User Interface Design

\#\#\# 5.1 Design Principles  
\- \*\*Aesthetic\*\*: Gem-inspired palette (emerald green \#2E8B57, sapphire blue \#4169E1, etc.); subtle gradients; card designs with glossy effects.  
\- \*\*Ease\*\*: Large touch targets; minimal taps; always-visible key info.  
\- \*\*Layout\*\*: Portrait mode priority; responsive for landscape.

\#\#\# 5.2 Key Screens  
\- \*\*Launch Screen\*\*: Name entry form; "Join Room" button.  
\- \*\*Lobby Screen\*\*: Player list (avatars: human icon vs. AI bot); winning score slider; "Start" button (host only).  
\- \*\*Game Board Screen\*\*:  
  \- Top: Nobles row.  
  \- Center: Gem pile (interactive stacks); card market (3 rows for levels, 4 cards each).  
  \- Bottom: Current player's controls (buttons: Take Gems, Reserve, Buy).  
  \- Sides: Player panels (collapsible; show gems as icons, bought cards as grid, score badge). Rotate view for own panel.  
  \- Overlay: Turn indicator, chat bubble.  
\- \*\*End Screen\*\*: Confetti animation; score table; "Restart" button.  
\- \*\*Tutorial Screen\*\*: Step-by-step slides with animations.

\#\#\# 5.3 Wireframes (Textual Description)  
\- Game Board:   
  \- 20% Top: Nobles (horizontal scroll if needed).  
  \- 40% Center: Gems (circle layout); Cards (grid).  
  \- 20% Bottom: Action bar.  
  \- 10% Left/Right: Opponent panels (mini-views).  
  \- Own view: Full bottom panel on tap.

\#\# 6\. AI Strategies  
\- \*\*AI1 (Aggressive)\*\*: Prioritize buying high-point cards; take 2 same gems often.  
\- \*\*AI2 (Defensive/Reserve)\*\*: Reserve frequently to block others; focus on nobles.  
\- \*\*AI3 (Balanced)\*\*: Mix actions based on probabilities (e.g., 40% buy, 30% take 3, 20% take 2, 10% reserve).  
\- \*\*AI4 (Random)\*\*: Random valid action for unpredictability.  
\- Implementation: Decision tree evaluating board state; simulate 1-2 moves ahead for better AIs.

\#\# 7\. Development and Testing Plan  
\- \*\*Phases\*\*:   
  1\. Prototype: Core mechanics (single-device simulation).  
  2\. Multiplayer: Integrate backend.  
  3\. Polish: UI aesthetics, AI tuning.  
  4\. Testing: Alpha (internal), Beta (users).  
\- \*\*Risks\*\*: Network latency → Use optimistic UI (predict actions client-side, confirm server).  
\- \*\*Timeline\*\*: 3-6 months for MVP.

\#\# 8\. Appendices  
\- \*\*Glossary\*\*: Define terms like "reserve" per rules.  
\- \*\*Change Log\*\*: Initial version \- Dec 27, 2025\.

\# Splendor Mobile App: UI Design Requirements Document

\#\# 1\. Introduction

\#\#\# 1.1 Purpose  
This document provides a detailed specification for the User Interface (UI) design of the Splendor mobile app. It focuses exclusively on UI elements, layouts, aesthetics, and interactions, building upon the core game mechanics outlined in the main application design document. The UI design draws inspiration from the referenced screenshots of existing Splendor implementations, adapting their layouts while transforming the theme to a pixel art space exploration style. This theme reimagines the game's components in a retro-futuristic, pixelated aesthetic reminiscent of classic space adventure games (e.g., pixelated spaceships, starry backgrounds, alien artifacts).

Key explicit requirements:  
\- Every player must be able to view other players' chips (gems) and bought cards readily, without additional touches or actions—these elements are always on display in compact, visible panels.  
\- Players must not be able to view other players' reserved cards; these are hidden from opponents.  
\- Each player can view their own current (bought) cards and reserved cards in more detail, with options for zooming or expanding views on their personal panel.

\#\#\# 1.2 Scope  
\- \*\*Theme\*\*: Pixel space exploration—pixel art graphics with space motifs (e.g., gems as colorful cosmic crystals/asteroids, development cards as space modules/technologies, nobles as alien overlords/space explorers, background as starry nebula with pixelated effects).  
\- \*\*Platform\*\*: Mobile-first (phones), responsive for tablets; portrait mode primary, with landscape support.  
\- \*\*Inspirations from References\*\*:  
  \- First screenshot (lobby/AI selection): Modular player selection panels with icons, rules summary on right, play button at bottom. Adapted to space theme: AI profiles as pixelated space captains with badges (e.g., gears become rocket thrusters).  
  \- Second screenshot (game board): Central card market in rows, gems as circular tokens, player areas at bottom. Adapted: Multi-row card display (levels as orbit levels), gems as floating orbs, player's reserved cards in a expandable dock.  
\- \*\*Exclusions\*\*: Non-UI aspects like backend logic or AI strategies (covered in main document).

\#\#\# 1.3 Target Audience  
Casual gamers seeking an intuitive, visually engaging experience on mobile devices.

\#\#\# 1.4 References  
\- Existing Splendor app screenshots (provided): Lobby for player setup; game board for gameplay layout.  
\- UI Style: Pixel art tools/inspirations (e.g., Aseprite-style graphics); space themes from games like Pixel Starships or classic arcade space games.

\#\# 2\. Design Principles

\- \*\*Aesthetic\*\*: Pixel art with a space exploration theme—vibrant pixelated colors (neon blues \#00FFFF for sapphires/quantum crystals, fiery reds \#FF4500 for rubies/lava asteroids, etc.); starry black/purple backgrounds with subtle pixelated star twinkles and nebula gradients. Elements have retro glow effects and simple animations (e.g., pixelated shimmer on gems).  
\- \*\*Ease of Use\*\*: Intuitive, touch-friendly controls with large hit areas; minimal taps for core actions. Always-visible public info for other players to promote strategic awareness without disruption.  
\- \*\*Visibility Requirements\*\*:  
  \- Other players' chips (gems) and bought cards: Displayed in persistent side or top panels, updated in real-time, showing counts/icons for gems and mini-grids for bought cards (with bonuses/points visible but not interactive).  
  \- Reserved cards: Strictly private—hidden from others; for the owner, displayed in a detailed personal area with zoom/tap for full card details (e.g., pixelated artwork, exact costs/bonuses).  
  \- Own cards: Bought cards shown in a detailed grid on the player's panel, with hover/tap for enlarged views showing pixelated space-themed art and stats.  
\- \*\*Responsiveness\*\*: Adaptive layouts for phone screens; elements scale without clutter.  
\- \*\*Accessibility\*\*: High-contrast pixel art; color-blind modes (e.g., shape-coded gems); voice-over support for key elements.  
\- \*\*Animations\*\*: Subtle pixelated effects (e.g., gem collection with pixel explosion, card purchase with warp-in animation) to enhance engagement without overwhelming.

\#\# 3\. Key Screens

\#\#\# 3.1 Launch Screen  
\- \*\*Layout Inspiration\*\*: Simple entry form, similar to minimal app starts but with space theme.  
\- \*\*Elements\*\*:  
  \- Background: Pixelated starry void with floating asteroids.  
  \- Central Prompt: Pixelated text "Enter Your Explorer Name" with input field (alphanumeric, 3-15 chars).  
  \- Button: "Launch into Space" (pixelated rocket icon) to join room.  
  \- Error Messages: Pixelated alerts (e.g., "Room at Maximum Capacity\!" if full).  
\- \*\*Details\*\*: No clutter; immediate focus on input. If room full, show a pixelated "Access Denied" animation.

\#\#\# 3.2 Lobby Screen  
\- \*\*Layout Inspiration\*\*: From first screenshot—grid of player/AI selections on left, rules summary on right, play/order buttons at bottom.  
\- \*\*Elements\*\*:  
  \- Background: Pixelated space station interior with windows showing stars.  
  \- Player List: 4 slots in a 2x2 grid (like screenshot's AI profiles). Each slot shows:  
    \- Human: Entered name with pixelated avatar (customizable space suit).  
    \- AI: Profiles like "Nebula Navigator" (Balanced), "Asteroid Aggressor" (Aggressive), etc., with pixelated icons (e.g., balanced scales as orbiting planets, gears as satellite dishes).  
    \- Always display current occupants; waiting slots show "Awaiting Explorer" with pulsing animation.  
  \- Rules Summary (Right Panel, like screenshot): Pixelated text/icons for "4-Explorer Mission", "5 Alien Overlords", "5 Quantum Jokers (Gold)", "7 Cosmic Crystals per Type", "Target Signal Strength: 15" (prestige points).  
  \- Configuration: Slider for winning score (10-20, default 15\) as a pixelated energy bar, editable by host (first joiner).  
  \- Bottom Bar: "Crew Order: Random" toggle (pixelated shuffle icon); "Initiate Mission" (Play) button for host.  
  \- Chat: Small pixelated comms bubble for text messages.  
\- \*\*Details\*\*: AI profiles have thematic badges (e.g., shield as force field). Best score shown as "Galactic High Score: None Recorded" with pixelated trophy.

\#\#\# 3.3 Game Board Screen  
\- \*\*Layout Inspiration\*\*: From second screenshot—top/middle for market/nobles, bottom for player controls, sides for opponents.  
\- \*\*Elements\*\*:  
  \- Background: Deep space pixelated vista with floating debris and distant planets.  
  \- Top Section (20%): Alien Overlords (Nobles) row—horizontal scrollable pixelated portraits of alien species (e.g., tentacled beings instead of historical figures), showing requirements (crystal icons) and points. Auto-award animation: Pixelated beam when claimed.  
  \- Central Board (40%):  
    \- Cosmic Crystals (Gems): Circular pixelated orbs in a cluster (like screenshot's right-side gems), with counts (e.g., 7 green quantum shards). Touch to select for actions; always visible stack counts.  
    \- Development Market: 3 rows for levels (Orbit 1 bottom, Orbit 2 middle, Orbit 3 top, like screenshot's card rows). Each row: 4 face-up pixelated cards (space tech art, e.g., low-level as basic probes, high-level as starships). Decks as stacked pixel modules on left. Tap/drag for buy/reserve.  
  \- Player Panels:  
    \- Own Player (Bottom 20%): Detailed dock with:  
      \- My Cosmic Crystals: Icon row with counts (like screenshot's bottom gems), limit 10/10 indicator.  
      \- Bought Modules (Cards): Expandable grid showing pixelated art, bonuses (glowing crystal icons), points. Tap to zoom for detailed view (full art, stats popup).  
      \- Reserved Probes (Cards): Private section (3/3 max), shown as hidden slots to others but detailed cards to owner—tap to enlarge with pixelated secrets revealed.  
      \- My Overlords (Nobles): Small area for claimed aliens.  
      \- Action Bar: Pixelated buttons for "Harvest Crystals" (take gems), "Secure Probe" (reserve), "Deploy Module" (buy). Undo button as rewind icon.  
    \- Other Players (Sides/Top, 10-15% each): Compact always-visible panels (no tap needed):  
      \- Gems: Mini icon row with counts (visible at a glance).  
      \- Bought Cards: Mini-grid of icons (bonuses/points shown as tiny pixels, no details to prevent clutter but enough for strategy).  
      \- Score: Pixelated prestige badge.  
      \- Reserves: Hidden—shown as "?" slots or "Classified" label.  
      \- Panels rotate or stack based on orientation; e.g., opponents on sides in portrait.  
  \- Overlays: Turn indicator as "Explorer X's Orbit" with pixelated spotlight; chat comms panel; eye icon for view modes.  
\- \*\*Details\*\*: Real-time updates with pixel glows. Own reserves/bought cards allow detailed inspection (e.g., popup with enlarged pixel art, tooltips for space lore flavor text).

\#\#\# 3.4 End Screen  
\- \*\*Layout Inspiration\*\*: Post-game summary, extending game board style.  
\- \*\*Elements\*\*:  
  \- Background: Victory nebula explosion (pixelated fireworks).  
  \- Central: Winner announcement ("Explorer X Conquers the Galaxy\!") with scores table (pixelated grid: names, points, cards bought).  
  \- Replay Stats: Pixelated charts for gems collected, etc.  
  \- Buttons: "Remap Stars" (Restart), "Exit Void" (Quit).  
\- \*\*Details\*\*: Confetti as pixel stars; thematic win/loss messages.

\#\#\# 3.5 Tutorial/Help Screen  
\- \*\*Layout\*\*: Step-by-step slides with interactive demos.  
\- \*\*Elements\*\*: Pixelated comic-strip style explanations of actions, using space analogies (e.g., "Harvest Crystals from Asteroid Fields").  
\- \*\*Details\*\*: Arrows pointing to elements, mimicking game board layout from screenshot.

\#\# 4\. Wireframes (Textual Descriptions)

\- \*\*Lobby\*\*:  
  \`\`\`  
  \[Starry Background\]  
  \[Player Grid 2x2: Avatar | Name | Icon\]  
  \[Rules Panel: Text \+ Icons\]  
  \[Bottom: Order Toggle | Play Button\]  
  \`\`\`  
\- \*\*Game Board\*\*:  
  \`\`\`  
  \[Top: Overlords Row\]  
  \[Center: Crystals Cluster | Market Rows (Orbit 3/2/1)\]  
  \[Bottom: Own Gems | Reserves (Detailed) | Bought (Zoomable) | Actions\]  
  \[Sides: Opponent Panels (Gems Icons | Mini Bought Grid | Score)\]  
  \`\`\`  
\- Adaptations ensure visibility: Opponent panels pinned, own details expandable.

\#\# 5\. Additional UI Requirements

\- \*\*Interactions\*\*: Drag gems/cards with pixel trails; tap validations with error shakes.  
\- \*\*Themes\*\*: Light/dark modes (space day/night—brighter nebulae vs. dark void).  
\- \*\*Performance\*\*: 60FPS pixel animations; load assets efficiently.  
\- \*\*Testing\*\*: User feedback on visibility (e.g., can players spot opponents' bonuses quickly?).

\#\# 6\. Appendices

\- \*\*Color Palette\*\*: Primary: Space Black \#000000, Nebula Purple \#4B0082; Gems: Quantum Blue \#00BFFF, Lava Red \#FF4500, etc.  
\- \*\*Asset Guidelines\*\*: All graphics in pixel art (16x16 or 32x32 tiles for icons).  
\- \*\*Change Log\*\*: Initial version \- December 27, 2025\.

\# Splendor Mobile App: AI Strategies Implementation Document

\#\# 1\. Introduction

\#\#\# 1.1 Purpose  
This document provides a comprehensive guide for implementing the AI player strategies in the Splendor mobile app. It builds upon the core game mechanics and requirements outlined in the main application design document, focusing exclusively on the non-human (AI) players. The AI must fill any remaining player slots (up to 4 total players) and exhibit varied strategies to enhance gameplay diversity, challenge, and replayability. Strategies are designed to simulate intelligent, human-like decision-making while adhering to Splendor's rules, such as turn-based actions (taking gems, reserving cards, buying cards), gem limits (max 10), reserve limits (max 3), and end-game conditions.

Key design principles:  
\- \*\*Variety\*\*: Four distinct AI personalities (Aggressive, Defensive/Reserve-Focused, Balanced, Random) to cater to different playstyles and difficulty levels.  
\- \*\*Flexibility\*\*: The system must allow easy updates, such as tweaking strategy parameters, adding new AI types, or switching between implementation approaches without major refactoring.  
\- \*\*Performance\*\*: AI decisions should compute quickly (under 3 seconds per turn) to maintain smooth multiplayer flow, especially on mobile devices.  
\- \*\*Fairness\*\*: AI must strictly follow game rules, with no access to hidden information (e.g., other players' reserves).  
\- \*\*Approaches\*\*: Two primary methods are detailed—querying large language models (LLMs) for dynamic decisions or building local algorithms for deterministic, efficient execution. The choice depends on factors like development resources, latency tolerance, and update frequency.

\#\#\# 1.2 Scope  
\- \*\*Inclusions\*\*: Detailed descriptions of each AI strategy, decision-making processes, evaluation criteria, and integration with the game engine.  
\- \*\*Exclusions\*\*: Actual code snippets, UI interactions (covered in UI document), or backend synchronization (covered in main design document). This focuses solely on AI logic.  
\- \*\*Assumptions\*\*: AI operates on a shared game state (board gems, visible cards, players' public info like gems and bought cards). Random elements (e.g., card draws) are handled by the game engine.

\#\#\# 1.3 References  
\- Main Application Design Document: For game mechanics and data models (e.g., Player, Board, Card objects).  
\- Splendor Rules: https://www.dicebreaker.com/games/splendor/how-to/how-to-play-splendor-board-game.  
\- AI Inspirations: Board game AI techniques like decision trees, heuristics, and Monte Carlo simulations, adapted for mobile constraints.

\#\# 2\. Overview of Implementation Approaches

To ensure flexibility, the AI system supports two interchangeable approaches. The app's architecture should include a strategy selector that can toggle between them at runtime (e.g., via config files or admin settings). This allows for A/B testing, performance optimization, or future enhancements like hybrid modes (e.g., local for quick decisions, LLM for complex scenarios).

\#\#\# 2.1 Approach 1: Querying Large Language Models (LLMs)  
This method leverages external or integrated LLMs (e.g., Grok, GPT models) to generate AI actions dynamically. It offers high adaptability, as strategies can be updated by modifying prompts without app redeployment.

\- \*\*Process Flow\*\*:  
  1\. On AI turn start, serialize the game state into a structured prompt (e.g., JSON-like description of board, players' public info, AI's private reserves, current score).  
  2\. Send the prompt to the LLM via API call (e.g., over HTTP to a cloud service or local inference if embedded).  
  3\. The LLM responds with a parsed action (e.g., "buy card ID X" or "take gems: 2 red").  
  4\. Validate the action server-side for rule compliance; if invalid, fallback to a default (e.g., random valid action).  
  5\. Execute and broadcast the action.

\- \*\*Prompt Design\*\*:  
  \- Base Template: "You are an AI player in Splendor with \[strategy type\] style. Game state: \[detailed state\]. Choose one valid action: take 3 different gems (list colors), take 2 same gems (color), reserve a card (level and position, optional gold), or buy a card (level and position, or from reserve). Prioritize \[strategy-specific goals\]. Explain reasoning briefly."  
  \- State Description: Include gem piles (counts per color), market cards (level, position, cost, bonus, points), nobles (requirements, points), all players' public gems/bought cards/scores, AI's reserves/gems.  
  \- Strategy Customization: Append personality-specific instructions (e.g., for Aggressive: "Focus on buying high-point cards quickly, prefer taking 2 of one color to build monopolies").  
  \- Output Format: Enforce structured response (e.g., JSON: {"action\_type": "buy", "details": {"level": 3, "position": 2}, "reasoning": "Brief explanation"}).

\- \*\*Advantages\*\*: Highly flexible—update strategies by changing prompts. Can incorporate advanced reasoning (e.g., multi-turn planning) without local complexity. Easy to add nuanced behaviors like adapting to opponents' strategies.  
\- \*\*Challenges and Mitigations\*\*:  
  \- Latency: Limit to 2-3 second timeouts; use fast models or cache common states.  
  \- Cost: Monitor API usage; fallback to local if offline or over budget.  
  \- Consistency: Use few-shot examples in prompts to guide outputs; post-process responses for validation.  
  \- Flexibility for Updates: Store prompts in external config files or databases, allowing remote updates without app rebuilds.

\#\#\# 2.2 Approach 2: Building Local Algorithms  
This method uses rule-based, heuristic-driven logic implemented directly in the app's code (e.g., in the AI module). It ensures low latency and offline capability, ideal for mobile.

\- \*\*Process Flow\*\*:  
  1\. On AI turn, the game engine passes the current state to the AI strategy handler.  
  2\. The handler evaluates possible actions using a decision tree or scoring system.  
  3\. Select the highest-scoring valid action.  
  4\. Simulate execution to confirm (e.g., check gem affordability).  
  5\. Return the action for game engine processing.

\- \*\*Core Components\*\*:  
  \- Decision Tree: A hierarchical evaluation (e.g., first check if buyable cards exist, then score them).  
  \- Heuristics: Weighted scores for actions based on strategy (e.g., value of points per gem spent).  
  \- Simulation: For advanced AIs, simulate 1-2 moves ahead to predict outcomes (e.g., noble acquisition).  
  \- Randomness: Introduce variability (e.g., probabilistic selection among top actions) to avoid predictability.

\- \*\*Advantages\*\*: Fast, deterministic, no external dependencies. Easier to debug and optimize for performance.  
\- \*\*Challenges and Mitigations\*\*:  
  \- Rigidity: Use modular classes (e.g., one per strategy) with configurable parameters (e.g., weights in JSON files).  
  \- Complexity: Limit depth of simulations to avoid computation overhead.  
  \- Flexibility for Updates: Parameterize all key values (e.g., action probabilities, score thresholds) in external configs, enabling over-the-air updates via app patches or server-sync.

\#\#\# 2.3 Hybrid and Selection Mechanism  
\- Implement a selector in the AI module that chooses the approach based on context (e.g., use local for Random AI, LLM for Balanced to leverage reasoning).  
\- For updates: Both approaches support versioning—track strategy versions in configs, allowing rollback or A/B testing.

\#\# 3\. Detailed AI Strategies

Each AI type has unique priorities, evaluated per turn. Strategies consider the full game state, including progress toward nobles, opponents' strengths, and resource scarcity.

\#\#\# 3.1 AI1: Aggressive (High-Point Buyer)  
\- \*\*Core Focus\*\*: Maximize prestige points quickly by buying valuable cards, building gem bonuses aggressively.  
\- \*\*Decision Hierarchy\*\*:  
  1\. Check for buyable cards: Prioritize level 3 (high points), then level 2; score by points/effective cost (accounting for own bonuses).  
  2\. If no buys, take gems: Prefer 2 of one color needed for future high-point cards (e.g., if low on red and red-heavy cards available).  
  3\. Reserve rarely: Only if a high-point card is at risk (e.g., opponent close to affording it).  
  4\. Noble Pursuit: Bias toward cards that advance noble requirements, especially if 1-2 away.  
\- \*\*Evaluation Details\*\*: Score buys as (points \* 2\) \- (gems spent after bonuses); add bonus if it unlocks a noble. Simulate ahead: If buy leads to immediate noble, prioritize.  
\- \*\*Variability\*\*: 80% chance to pick top-scored action, 20% second-best for unpredictability.

\#\#\# 3.2 AI2: Defensive/Reserve-Focused (Blocker)  
\- \*\*Core Focus\*\*: Disrupt opponents by reserving key cards, focus on nobles for passive points.  
\- \*\*Decision Hierarchy\*\*:  
  1\. Reserve cards: Target those opponents are building toward (e.g., if opponent has bonuses matching a card's cost).  
  2\. Buy if possible: Prefer cards that block nobles or provide defensive bonuses (e.g., diverse gems to meet multiple nobles).  
  3\. Take gems: 3 different to build flexibility, or 2 same if gold low (to enable more reserves).  
  4\. Monitor Opponents: Track public bonuses; reserve if an opponent is 1-2 gems away from buying.  
\- \*\*Evaluation Details\*\*: Score reserves by opponent threat level (e.g., \+5 if blocks leader); nobles as primary goal—aim for 2-3 nobles by mid-game.  
\- \*\*Variability\*\*: High reserve probability (50%); adjust based on reserve slots left.

\#\#\# 3.3 AI3: Balanced (Adaptive Mixer)  
\- \*\*Core Focus\*\*: Blend actions probabilistically, adapting to game phase (early: build bonuses; mid: nobles; late: points).  
\- \*\*Decision Hierarchy\*\*:  
  1\. Probabilistic Selection: 40% buy (if affordable), 30% take 3 gems, 20% take 2 gems, 10% reserve.  
  2\. Within categories: Score buys by efficiency (points/cost); gems by need (e.g., fill shortages for nobles/cards).  
  3\. Adaptivity: In late game (scores \>10), increase buy probability to 60%.  
  4\. Simulation: Look 1-2 turns ahead for noble triggers or win conditions.  
\- \*\*Evaluation Details\*\*: Use weighted averages; e.g., gem takes scored by utility (how much they reduce future costs).  
\- \*\*Variability\*\*: Randomize within probabilities; re-roll if action invalid.

\#\#\# 3.4 AI4: Random (Unpredictable)  
\- \*\*Core Focus\*\*: Provide baseline challenge with pure randomness among valid actions.  
\- \*\*Decision Hierarchy\*\*:  
  1\. Generate all valid actions (e.g., list buyable cards, possible gem takes, reservable cards).  
  2\. Select uniformly at random.  
  3\. No prioritization or simulation.  
\- \*\*Evaluation Details\*\*: Minimal—ensure validity only.  
\- \*\*Variability\*\*: 100% random for chaos and testing.

\#\# 4\. Implementation Guidelines

\#\#\# 4.1 Integration with Game Engine  
\- AI Module: A dedicated class/module that receives game state and returns actions.  
\- State Handling: Use immutable copies for simulations to avoid side effects.  
\- Validation: Always check actions post-decision (e.g., gem availability).  
\- Logging: Record decisions/reasoning for debugging (e.g., "Aggressive AI buys level 3 card for 4 points").

\#\#\# 4.2 Performance Optimization  
\- Limit Simulations: Max 50-100 evaluations per turn.  
\- Caching: Pre-compute common scores (e.g., affordable cards list).  
\- Parallelism: If local, use lightweight threads for simulations.

\#\#\# 4.3 Testing and Balancing  
\- Unit Tests: Simulate states and verify actions match strategy.  
\- Playtesting: Run 100+ games; adjust weights for \~50% win rate against humans.  
\- Metrics: Track avg turns to win, noble acquisitions, etc.

\#\# 5\. Flexibility and Updates for Non-Human Players

\- \*\*Modularity\*\*: Strategies as subclasses/interfaces; add new ones by extending (e.g., "Expert AI" with deeper simulation).  
\- \*\*Configuration\*\*: Use JSON/YAML files for parameters (e.g., probabilities, weights); load at startup or sync from server.  
\- \*\*Versioning\*\*: Tag strategies with versions; allow user/host selection (e.g., "Choose AI Difficulty").  
\- \*\*Future-Proofing\*\*: Design for ML integration (e.g., train models on play data); hybrid toggles for LLM/local switches.  
\- \*\*Update Process\*\*: For LLM: Revise prompts remotely. For local: App updates or dynamic loading of config/scripts.

\#\# 6\. Appendices

\- \*\*Glossary\*\*: Heuristics (rule-of-thumb scores), Simulation (hypothetical state projection).  
\- \*\*Risks\*\*: Overly aggressive AIs dominating—balance via testing.  
\- \*\*Change Log\*\*: Initial version \- December 27, 2025\.  
