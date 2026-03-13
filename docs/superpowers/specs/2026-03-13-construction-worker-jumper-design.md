# Construction Worker Jumper - Loading Screen Game Design

**Date:** 2026-03-13
**Project:** Inspector Gadget
**Ticket:** SFW-8
**Status:** Design Phase

---

## Overview

A bright, pixel-art arcade-style game that replaces the static loading spinner during document analysis (15-30 second wait). Players control a construction worker jumping over randomized construction debris to earn points, keeping users entertained while their bid or inspection report is being analyzed by OpenAI.

The game integrates seamlessly into both the bid-checker and inspection-report-analyser tools, improving perceived wait time and user satisfaction.

---

## Game Concept

**Core Loop:**
1. Player taps/presses spacebar to make construction worker jump
2. Jump over incoming obstacles to earn 1 point
3. 20-30% chance to encounter energy drink power-ups (bonus points)
4. Difficulty increases gradually as game progresses
5. Hit an obstacle → "You're fired!" screen (restart or continue to results)
6. When analysis completes → game continues until player finishes current attempt
7. Game ends → transition to analysis results with final score displayed

---

## Visual Design

### Aesthetic & Color Palette
- **Style:** Pixel art (8-bit retro arcade)
- **Colors:** Bright and cheerful palette
  - Oranges and yellows (construction theme, energy, warmth)
  - Bright blues and greens (accents, energy drinks, success states)
  - High contrast for readability
  - Avoid muted/realistic construction colors

### Character
- **Construction Worker Sprite**
  - Wears hard hat (iconic, instantly recognizable)
  - Simple, charming pixel design (16-32px height)
  - Two animation frames minimum (standing, jumping)
  - Orange or yellow colors for construction theme

### Obstacles
Randomized construction debris types to keep gameplay fresh:
- **Brick Piles** - Orange/red stacked bricks
- **Safety Barriers** - Orange plastic construction barriers
- **Scattered Tools** - Pixel hammers, wrenches, saws
- **Traffic Cones** - Orange/white cones

Each obstacle type behaves identically mechanically; variety is purely visual.

### Power-ups
- **Energy Drink** - Pixelated energy drink can
  - Bright color (neon green or electric blue recommended)
  - Distinct from obstacles for quick visual recognition
  - Appears 20-30% of successful jumps

### Game Over State
- **"You're fired!" Screen**
  - Large, bold red text for humor
  - Shows final score prominently
  - Two action buttons: "Restart Game" and "See Results"
  - Simple background, no visual clutter

---

## Gameplay Mechanics

### Controls

| Platform | Input Method | Behavior |
|----------|---------------|----------|
| Desktop | Spacebar | Player jumps when pressed |
| Mobile/Tablet | Tap Button | Dedicated UI button at bottom |
| Mobile/Tablet | Screen Tap | Tapping anywhere on screen also triggers jump (in addition to button) |

### Scoring System
- **Base Points:** 1 point per successful jump over an obstacle
- **Bonus Points:** Energy drink catch adds 5 bonus points
- **Score Display:** Real-time counter at top-left of game canvas (visible on all screen sizes)

### Difficulty Progression
- **Initial Difficulty:** Slow, widely-spaced obstacles (easy to jump)
- **Progression:** Over time, gradually increase:
  - Obstacle speed (move faster toward player)
  - Spawn frequency (shorter gaps between obstacles)
  - Obstacle spacing (require more precise timing)
- **No Difficulty Spike:** Smooth curve, not jarring jumps in challenge
- **Target:** ~10-12 obstacles during typical 15-30 second analysis window
- **Continuous Play:** If analysis takes longer than expected, obstacle difficulty continues to increase. Game doesn't pause or stop—player can keep playing indefinitely until hitting an obstacle

### Jump Mechanics
- **Animation:** Smooth arc (player jumps up, lands down) over ~300-400ms
- **Height:** Worker jumps high enough to clear all obstacles
- **Hitbox:** Worker has a tight collision box; obstacles have equally precise hitboxes for fair, skill-based gameplay
- **Collision Logic:** If worker overlaps obstacle hitbox during jump/landing, game ends (no grazing allowed)

### Power-up Spawning
- When an obstacle would spawn, there's a 20-30% chance it becomes an energy drink instead
- Energy drinks spawn at mid-screen, same as obstacles
- Jumping over energy drink = +5 bonus points (no special animation needed, just add to score)

### Game States

#### Playing
- Worker visible at bottom of screen (stationary position)
- Obstacles scroll down from top toward player at increasing speed
- Energy drinks occasionally appear instead of obstacles
- Score updates in real-time on top-left when jump completes or power-up collected
- Mobile: tap button visible at bottom-center, disabled during game-over/results screens
- "Results Ready" indicator: Subtle green banner at bottom of screen that appears when analysis completes (doesn't interrupt gameplay)

#### Analysis Complete
- Subtle indicator shows results are ready (visual cue, no alert)
- Game continues uninterrupted
- Player can finish current attempt

#### Game Over (Hit Obstacle)
- Immediate transition to "You're fired!" screen (full-screen modal overlay)
- Final score displayed prominently
- Two options:
  - **Restart Game** → Score resets to 0, obstacles clear, game resumes immediately
  - **See Results** → Game closes, analysis results display below
- Mobile: Tap button is disabled during game-over screen to prevent accidental presses
- If analysis is already complete, "See Results" button is highlighted/primary
- Minimum 2-3 second display before allowing action (prevents accidental dismissal)

#### Results Ready
- If user selects "See Results" or game naturally concludes without hitting obstacle
- Game closes, analysis results displayed below
- Final game score shown alongside results for context

### Audio
- **Sound Design:** None (silent game)
- Reduces complexity, works in any environment (office, public)
- Visual feedback only (jump animation, collision effects, score popup)

---

## Component Structure

### Main Game Component
- **File:** `components/LoadingGame.tsx`
- **Props:**
  - `isAnalysisComplete: boolean` — indicates when results are ready
  - `onGameEnd: (finalScore: number) => void` — callback when player ends game
  - `onViewResults: () => void` — callback to transition to results
- **State:**
  - Current score
  - Game state (playing, gameOver, resultsReady)
  - Worker position
  - Active obstacles
  - Game timer

### Sub-components
- **Worker Sprite** — Animated construction worker character
- **Obstacle** — Single obstacle instance (generic, styled by type)
- **PowerUp** — Energy drink visual
- **ScoreDisplay** — Top-left score counter
- **GameOverModal** — "You're fired!" screen with buttons
- **TapButton** — Mobile-only tap target

### Asset Management
- Pixel art sprites as inline SVG or data URIs (no external image files)
- Simple sprite sheet for character animation
- CSS for responsive sizing across devices

---

## Integration with Loading Flow

### Bid Checker Tool Flow
1. User uploads bid → form disables
2. Loading game renders instead of spinner
3. Analysis processes (PDF parse + OpenAI analysis)
4. Player plays game while waiting
5. Analysis completes → game shows "results ready" indicator, continues
6. Player hits obstacle or finishes attempt
7. Game ends → results display with final score

### Inspection Report Analyser Tool Flow
- Same flow as bid checker
- Game is reusable component across tools

### Technical Integration Points

**In `BidChecker.tsx` (or equivalent):**
```
if (isProcessing) {
  return <LoadingGame
    isAnalysisComplete={analysisComplete}
    onGameEnd={handleGameEnd}
    onViewResults={handleViewResults}
  />
}
```

**Timing:** Game renders immediately when `isProcessing = true`, before any API calls complete.

---

## Success Criteria

✅ Game is engaging during the 15-30 second analysis window
✅ Users perceive wait time as shorter due to engagement
✅ Works seamlessly on mobile and desktop
✅ No sound, so safe for any environment
✅ Game completes before or around same time as analysis
✅ Player can finish attempt before seeing results (UX-friendly)
✅ Final score displayed with results (nice-to-have: leaderboard/share)
✅ Brand-aligned: construction worker + debris theme matches SFW Construction

---

## Technical Considerations

- **Lightweight:** Canvas API or minimal pixel-art library (no Three.js, Babylon.js, etc.)
- **Performance:** 60 FPS target on mobile devices
- **Responsiveness:** Game scales smoothly to all screen sizes
- **Accessibility:** Keyboard (spacebar) + tap support; no color-only cues
- **Future Expansion:** Designed to be reusable for other loading screens in Inspector Gadget

---

## Implementation Details

### Decided
- ✅ Bonus Points: 5 points per energy drink
- ✅ Jump Arc: Smooth animation over 300-400ms
- ✅ Collision: Tight hitboxes, no grazing allowed
- ✅ Mobile Button Position: Bottom-center
- ✅ Score Counter: Top-left with number only
- ✅ Game-over Delay: Minimum 2-3 second display before allowing action
- ✅ Results Ready Indicator: Subtle green banner at bottom
- ✅ Tap Guard: Button disabled during game-over modal

### Open for Dev Decisions
1. **Animation Frames:** Minimum 2 for worker (stand/jump); optional: falling, celebrating
2. **Obstacle Appearance:** Do they get visually larger as they approach, or stay same size?
3. **Leaderboard:** Excluded from initial release (can be added later)
