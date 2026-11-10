# Design system: "soft slab"

A reusable design language for messaging and social apps, written from the reference
mockup `ChatApp.08.jpeg` (three phone screens: a group chat, a community feed and a video
room). Every colour below was **sampled from that image**. Follow this document and any
app, in any framework, will come out looking like the reference.

---

## 1. The look in one paragraph

Cool, pale sage-grey surfaces. **Near-black slabs** sit on top of them: header blocks with
big rounded bottom corners (the "notch") and floating pill bars. Everything interactive is
round: circular icon buttons with a thin ring, pill-shaped inputs and bars. Colour is
almost absent. The UI is grey, black and white, and **one warm gradient (apricot, rose,
orchid)** marks only the most important thing on each screen: the active tab, the main
action, a badge. Faces and photos carry the colour. Titles are **lowercase**, set in a
clean geometric sans. The result feels calm, premium and tactile.

---

## 2. Principles

1. **Two materials only.** A light *surface* (paper) and dark *slabs* (ink). Slabs float on
   the surface; nothing else gets a dark fill.
2. **One accent per screen.** The gradient appears on at most 1 or 2 elements per screen. If
   everything is special, nothing is.
3. **Round everything.** No sharp corners anywhere. Buttons are circles, inputs and bars are
   pills, cards are generous rounded rectangles.
4. **Content is the colour.** Avatars, faces and images supply the colour, so the chrome
   stays neutral.
5. **Quiet type.** Lowercase titles, regular weights, small grey metadata. No shouting.
6. **Depth through softness.** Wide, very faint shadows and thin rings, never hard borders.
7. **No emojis.** Every icon is an SVG line icon. Faces are illustrations or photos, never emoji.

---

## 3. Colour

### 3.1 Light theme (the reference)

| Token | Hex | Sampled from | Use |
|---|---|---|---|
| `surface` | `#E3E9E7` | screen background | App background (cool sage-grey, flat) |
| `surfaceRaised` | `#ECF0EF` | message composer | Inputs, light ring buttons, chips on light |
| `card` | `#F7FBFC` | incoming bubble | Incoming bubbles, light cards, sheets |
| `slab` | `#222021` | header block, tab bar, action bar | Headers ("notch"), floating bars, dark cards |
| `ink` | `#1F1F1F` | outgoing bubble, send button | Outgoing bubbles, primary buttons |
| `textPrimary` | `#0A0D0C` | titles, bubble text | Main text on light |
| `textSecondary` | `#5A605E` | "17 Members" subtitle | Metadata, labels on light |
| `textTertiary` | `#707775` | timestamps (sampled `#9AA19F`, darkened for 3.5:1 contrast) | Timestamps, placeholders |
| `textOnSlab` | `#FFFFFF` | "peak seekers" | Text on slabs and ink |
| `textOnSlabMuted` | `#A3A1A2` | "9 People" (sampled `#959394`, lightened for 4.5:1 on `slabRaised`) | Metadata on slabs |
| `ringOnSlab` | `rgba(255,255,255,0.10)` | rim of dark ring buttons | 1 px ring of buttons on slabs |
| `ringOnSurface` | `rgba(255,255,255,0.85)` | highlight of light ring buttons | Top-left highlight ring on light buttons |
| `success` | `#58B566` | "Online" dot | Live and online indicators only |
| `danger` | `#A8443A` | (not in the reference) | Error text and borders on light surfaces (4.5:1) |
| `dangerOnSlab` | `#EE9489` | (not in the reference) | Error text on slabs (4.5:1) |
| `badge` | `#DDAB7C` | notification badge | Count badges (or use the gradient) |

### 3.2 The accent gradient

Measured left to right across the heart button and the end-call button:

```
apricot  #E6A065  ──►  rose  #DB9796  ──►  orchid  #D092BB
   0%                     55%                      100%
```

- Direction: **left to right, slightly diagonal (about 100°)**.
- Use it for: the active tab button, the primary action (send on press, "create group",
  end call), count badges, the selected state, and special highlights such as read receipts.
- Never use it for: large backgrounds, text blocks or more than two elements per screen.
- Single-colour fallback (where gradients aren't possible): `#E09E7A`.

### 3.3 Dark theme (derived)

The reference is light. A dark theme keeps the same logic with the materials swapped:

| Token | Light | Dark |
|---|---|---|
| `surface` | `#E3E9E7` | `#0E0E0F` |
| `surfaceRaised` | `#ECF0EF` | `#18181A` |
| `card` | `#F7FBFC` | `#212123` |
| `slab` | `#222021` | `#2A292C` (lifted above the surface, like an elevated iOS dark surface) |
| `slabRaised` | `#3A3839` | `#3B3A3E` |
| `slabEdge` | transparent | `rgba(255,255,255,0.08)` hairline on the notch's lower edge |
| `ink` (outgoing) | `#1F1F1F` | `#F2F4F3` (outgoing becomes light, so it still stands out) |
| `textPrimary` | `#0A0D0C` | `#F3F5F4` |
| `textSecondary` | `#5A605E` | `#A3A8A6` |
| `textTertiary` | `#707775` | `#858B89` |
| `textOnSlabMuted` | `#A3A1A2` | `#A9A7A8` |
| `danger` / `dangerOnSlab` | `#A8443A` / `#EE9489` | `#E07A6F` / `#EE9489` |
| Gradient | unchanged | unchanged |

Contrast is checked by `theme.test.js`: body text 4.5:1 or more, tertiary text 3.5:1 or more.
The dark notch must stand 1.3:1 off the surface and 1.4:1 off the black island (visual review,
V2): the old `#0B0B0B` slab on `#141414` measured 1.08:1 and vanished.
Known exception: white labels on the accent gradient measure about 2.2:1 to 2.5:1; they are
kept for the look and always appear on short, bold labels, badges and icons.

### 3.4 Background behind the phones (presentation only)

The mockup board uses a warm wash from `#D3A49C` (dusty pink) to `#D2C398` (sand). It is
not part of the app, but it works well for splash screens and store screenshots.

---

## 4. Typography

The reference uses a neo-grotesque sans with double-storey `a` and open apertures: Inter,
SF Pro or similar.

| Role | Font | Size / line | Weight | Case | Example |
|---|---|---|---|---|---|
| `display` | Inter | 34 / 38 | 600 | sentence | "Chasing sunsets and mountain tops" (on images) |
| `title` | Inter | 26 / 30 | 500 | **lowercase** | "peak seekers", "friendlyhours" |
| `heading` | Inter | 18 / 22 | 500 | Title Case | "Code & Cocktails" |
| `body` | Inter | 16 / 22 | 400 | sentence | message text |
| `meta` | Inter | 14 / 18 | 400 | Title Case | "17 Members", "9 People" |
| `caption` | Inter | 11 / 14 | 400 | uppercase AM/PM | "7:55 PM" timestamps |
| `chip` | Inter | 13 / 16 | 500 | Title Case | "Hiking" |

- Letter spacing: titles −0.5, display −1, everything else 0.
- Titles are always lowercase, including app and screen names.
- Never use bold (700+) except for a single display line on top of an image.

### 4.1 Wordmark: `huddle.`

```
   huddle●        Inter 600, lowercase, letter spacing -1.5 (at 40)
         └─ full stop drawn as an SVG circle filled with the accent gradient,
            diameter = 0.22 × font size, sitting on the baseline, gap 0.04 × font size
```

- Sizes: **40** on login and splash, **26** in the top bar, **20** in compact places.
- The text takes `textPrimary` (or `textOnSlab` on dark). Only the dot carries the gradient, so on a
  screen that shows the wordmark, the dot *is* that screen's accent.
- Never set the name in capitals, never drop the full stop, and never use a typed `.` character, so the dot
  stays round and in gradient at every size.
- Motion: on the splash and login screens the dot drops in last with a small bounce (spring, 300 ms) and a light haptic.

---

## 5. Shape, spacing and depth

### 5.1 Radii

| Element | Radius |
|---|---|
| Phone screen / sheets | 44 |
| Header slab ("notch"), bottom corners only | 36 |
| Large cards (feed card, media tile) | 32 |
| Message bubble | 24, with the corner nearest the avatar at **8** (the "tail") |
| Image inside a bubble | 18 |
| Pills (composer, tab bar, action bar, chips) | 999 (fully round) |
| Ring icon button | circle |

### 5.2 Spacing (4 pt grid)

`4, 8, 12, 16, 20, 24, 32, 40`. Screen side padding is **16**. Gap between messages is **12**,
and **20** between groups of messages from different senders. Content inside slabs has
**20** padding.

### 5.3 Depth

| Level | Use | Shadow |
|---|---|---|
| 0 | surface | none |
| 1 | bubbles, chips, inputs | `0 2 8 rgba(31,31,31,0.06)` |
| 2 | cards, light ring buttons | `0 8 24 rgba(31,31,31,0.10)` plus a white 1 px top-left highlight |
| 3 | floating tab bar, action bar, sheets | `0 16 40 rgba(31,31,31,0.25)` |

The "tactile" ring buttons combine a faint outer shadow with an inner white highlight on
the top-left edge (light) or a `ringOnSlab` stroke (dark). This gives a soft, pressed-metal
feel without heavy neumorphism.

### 5.4 Icons

**SVG** line icons with a **1.5 px stroke** and rounded caps (Lucide; in React Native use
`lucide-react-native`, drawn via `react-native-svg`). Never icon fonts, never emoji. Sized 22 in
48 pt buttons. Filled icons are used only inside the gradient (heart, star) or for a selected
state.

---

## 6. Components

Each component has an ASCII sketch, measurements and states. Symbols and bracketed words in
the sketches (`(←)`, `(mic)`, ✓, `(heart)`) are placeholders for SVG icons, not characters to render.

### 6.1 Header slab ("notch")

```
╭──────────────────────────────────────────╮   slab #222021
│  (←)          peak seekers          (▢)  │   ring buttons 48, title 26 lowercase
│                                          │
│  ◉◉◉ +14                    ● Online     │   avatar stack 40, overlap −12
│                             ppl 9 People   │   meta 14, muted on slab
╰──────╮                          ╭────────╯   bottom radius 36
        surface continues below
```

- Full width, flush with the top, under the status bar; bottom corners only, radius 36.
- Row 1 (56 high): ring button, centred title, ring button.
- Row 2 (optional, 56): avatar stack on the left, status and count stacked on the right.
- Variant **compact**: row 1 only, used on secondary screens.

### 6.2 Ring icon button

```
   ╭───╮
  │ ← │      48×48 circle, icon 22, 1.5 px stroke
   ╰───╯
```

| State | On slab | On surface |
|---|---|---|
| default | fill `slab`, 1 px `ringOnSlab`, icon white | fill `surfaceRaised`, level-2 shadow, icon `textPrimary` |
| pressed | scale 0.97 (120 ms), fill +6% lighter | scale 0.97 (120 ms), shadow level 1 |
| active / primary | gradient fill, white icon | gradient fill, white icon |
| with badge | gradient dot 20, white count 11, top-left offset (−4, −4) | same |

### 6.3 Avatar stack

```
◉◉◉ +14       avatars 40, overlap 12 (each 28 apart), 2 px ring in the background colour
```

At most 3 faces, then a "+N" circle (`surfaceRaised` on light, `#3A3839` on slab).

### 6.4 Message bubbles

```
 ◉  ╭─────────────────────────────╮        incoming: card #F7FBFC, level-1 shadow
    │ Please provide more details │        avatar 28 beside the first bubble of a run
    ╰╴────────────────────────────╯        tail corner (bottom-left) radius 8
     7:55 PM                               caption, textTertiary, 6 below

            ╭───────────────────────────╮  outgoing: ink #1F1F1F, white text
            │ I like it! Another style  │  right-aligned, max width 78%
            ╰──────────────────────────╴╯  tail corner bottom-right
                                 8:12 PM
```

- Padding 14 × 12. Body text 16.
- **Image card** (incoming "Here's what I created"): a card bubble with padding 16, a text
  line, then images at radius 18, two side by side or one full width, followed by a footer
  row (avatar stack of viewers, action icons).
- Consecutive bubbles from the same sender: 4 apart, avatar only on the last one.

### 6.5 Composer

```
╭───────────────────────────────────╮ ╭────╮
│  +   Type your message...         │ │ ➤  │   pill 56 high, surfaceRaised
╰───────────────────────────────────╯ ╰────╯   send: 56 circle, ink, white icon
```

- The `+` opens attachments. The send button turns to the gradient while pressed, or when
  the message is ready to send.
- Sits 12 above the bottom safe area, with a 16 side margin.

### 6.6 Floating tab bar

```
      ╭──────────────────────────────────────╮
      │ (heart)  (ppl)  (⌂)  (chats)  (me)              │   slab pill, 72 high, radius 999
      ╰──────────────────────────────────────╯   items: ring buttons 56, gap 8
```

Floats 16 above the bottom safe area, centred, level-3 shadow. The **active item is
gradient-filled** with a white icon; inactive items have a ring on the slab with white
icons. Switching tabs springs the gradient between items.

### 6.7 Group card (feed card)

```
╭──────────────────────────────────────────╮
│ ◉◉◉ +14                 Code & Cocktails │  header row on light, heading + meta
│                         ppl 17 Members     │
│ ╭──────────────────────────────────────╮ │
│ │            (media / collage)         │ │  media radius 32
│ │ Chasing sunsets and                  │ │  display text on media, white
│ │ mountain tops                        │ │
│ │ (CraftBeer)(Hiking)(Running)         │ │  chips: frosted, white text
│ │ ╭──────────────────────────────────╮ │ │
│ │ │ (✕)   (star)   (➦)   (    heart     )   │ │ │  action bar: slab pill, one gradient pill
│ │ ╰──────────────────────────────────╯ │ │
│ ╰──────────────────────────────────────╯ │
│ ◉◉◉ +4                     Peak Seekers  │  dark footer slab, radius 32
│                            ppl 7 members   │
╰──────────────────────────────────────────╯
```

### 6.8 Chip

Pill, height 30, padding 14. On media: `rgba(255,255,255,0.22)` with blur and white text.
On surface: `surfaceRaised` with `textSecondary`.

### 6.9 Media tile grid ("room" screen)

```
╭──────────────────╮ ╭──────────────────╮
│ (≋)              │ │ (mic)            │   tiles: 2 columns, gap 8, radius 32
│                  │ │                  │   ring button 40 top-left (status icon)
│      face        │ │      face        │   content fills the tile
╰──────────────────╯ ╰──────────────────╯
```

Lives inside a slab with radius 36. Status icons use small ring buttons with a frosted fill.

### 6.10 Control bar

```
   ╭──────────────────────────────────╮
   │  (▭)   (hp)   (mic)   ( ✆ )       │   slab pill, ring buttons 56, the last one gradient
   ╰──────────────────────────────────╯
```

The bottom bar for a mode (call, selection). The gradient button is the commit action.

### 6.11 Badge, status and live dot

- Count badge: gradient circle 20, white 11 pt number, ring 2 px in the background colour.
- Live / online: 8 px `success` dot followed by the meta label.

---

## 7. Screen anatomy

```
┌ status bar ──────────────────────────────┐
│ header: slab "notch" OR light top bar     │  light top bar = ring button, lowercase title, ring button
├──────────────────────────────────────────┤
│                                          │
│ content on surface (16 side padding)     │  lists, bubbles, cards
│                                          │
│                                          │
│     ╭ floating bar (tabs / composer) ╮   │  never full-width; floats with a 16 margin
└──────────────────────────────────────────┘
```

- Primary screens such as feeds use a light top bar plus a floating tab bar.
- Detail screens such as chats and rooms use a slab header plus a floating composer or control bar.
- Content scrolls *under* floating bars. Add bottom padding equal to the bar height plus 32.

---

## 8. Motion

Calm and quick (retuned in the visual review, buildPlan.md 13 V1). Springs use Reanimated's
`duration` + `dampingRatio` form; no spring goes below a ratio of 0.85, so motion settles
instead of bouncing (`motion.test.js` enforces it). Springs are for things a finger moves and
for the island; everything else is a timing curve. UI timings stay at or under 300 ms.

| Interaction | Animation | Timing |
|---|---|---|
| Button press | scale to 0.97 on press-in, back on release | 120 ms, ease-out `(0.23, 1, 0.32, 1)` |
| Tab / segmented indicator | the pill glides to the new item, no overshoot | 250 ms, ease-in-out `(0.77, 0, 0.175, 1)` |
| New message | fades up 8 pt | 220 ms ease-out |
| Pop-ins (ticks, menus, faces) | fade plus a grow from 0.96 (never from 0) | 160-220 ms ease-out |
| Chat rows reorder | the row glides to its new place | 250 ms ease-in-out |
| Lists | no entrance on virtualized rows (they recycle); content is simply there | - |
| Sheet open | slides up on the iOS sheet curve `(0.32, 0.72, 0, 1)` | 300 ms |
| Drag release (orb, viewer) | snaps back carrying the finger's velocity | spring 400 ms, ratio 0.9 |
| Island morph | width, height and radius together; content follows the shape | spring 460 ms, ratio 0.86 |
| Error | horizontal shake (5 pt) | 280 ms |
| Images | fade to the sharp image | 200 ms |

Pair important touches with haptics, once per action and on the same frame as the visual:
**light** for presses, **medium** for long-press and switching, **success / error** for
outcomes. Reduce motion: movement and scale are dropped, opacity changes stay.

### 8.1 The notch island

A black pill around the front camera, above every screen (`NotchIsland`). Shapes: rest,
compact (content either side of the camera), multi (main pill plus up to two circles, like
the iPhone 18 Pro's three live activities), expanded (a card with quick reply), confirm (a
near-square with a drawn check). The shape leads and content follows; circles split off
through a liquid neck (an SVG path that thins to nothing) and merge back the same way. It is
always `#000000`, in both themes.

Liquid details: a 90 ms "inhale" (scaleX 1.04, scaleY 0.94) before any growth; a press squish
(wider 2.5%, shorter 5%); a stretch along a drag from its velocity (up to 6%); content scales
from the camera point (top centre). Arrival: one gradient ring, 600 ms. Rest: still, except
one breath (6% wider and back, with a faint rim) when the app returns and nothing is new.

---

## 9. Accessibility

- Contrast: `textPrimary` on `surface` is 17:1, white on `slab` is 16:1, `textSecondary`
  on `surface` is 5.6:1, all of which pass WCAG AA. `textTertiary` is for timestamps only (non-essential).
- Touch targets of at least 44 pt (ring buttons are 48).
- Text scales with the OS setting. Layouts wrap instead of truncating titles.
- The gradient never carries meaning alone: pair it with an icon or a label.
- Every icon-only button has an accessibility label.

---

## 10. Do and don't

| Do | Don't |
|---|---|
| Keep surfaces flat and pale; let slabs and faces carry contrast | Add coloured backgrounds or multiple accent colours |
| Use the gradient on 1 or 2 key elements | Put the gradient on text, borders or large areas |
| Use SVG line icons everywhere | Use emojis or icon fonts |
| Make every control round | Use square buttons or hard 1 px borders |
| Write titles in lowercase | Use bold all-caps headings |
| Float bars with margins and soft shadows | Dock full-width bars with hard top borders |
| Keep metadata small and grey | Repeat information in multiple colours |

---

## 11. Recreating it in code

Tokens as a plain object, which works in React Native, CSS-in-JS or any theme system:

```js
export const colors = {
  surface: '#E3E9E7', surfaceRaised: '#ECF0EF', card: '#F7FBFC',
  slab: '#222021', ink: '#1F1F1F',
  textPrimary: '#0A0D0C', textSecondary: '#5A605E', textTertiary: '#707775',
  textOnSlab: '#FFFFFF', textOnSlabMuted: '#A3A1A2',
  ringOnSlab: 'rgba(255,255,255,0.10)', success: '#58B566',
};
export const gradient = { colors: ['#E6A065', '#DB9796', '#D092BB'], locations: [0, 0.55, 1],
  start: { x: 0, y: 0.4 }, end: { x: 1, y: 0.6 } };
export const radius = { screen: 44, slab: 36, card: 32, bubble: 24, tail: 8, image: 18, pill: 999 };
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 40];
```

Build order for a new app: tokens, then ring button, header slab, floating bar, bubbles and
composer, cards, then motion.
