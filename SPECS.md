# Fast Wasp — Functional Specification

> *Intermittent fasting tracker. With a sting.*

---

## 1. Overview

Fast Wasp is a free Progressive Web App (PWA) for tracking intermittent fasting, body weight, and craving resistance. It requires no account and collects no data: everything is stored locally in your browser and never leaves your device. The app works fully offline after the first load and can be installed to the home screen on iOS and Android, where it runs as a standalone app indistinguishable from a native application.

The "sting" in the tagline refers to the **Resist** panic button — a one-tap tool for logging moments when you successfully resisted a craving.

---

## 2. Who It's For

Fast Wasp is for anyone practising **time-restricted eating** or **intermittent fasting** who wants a simple, private tracker. Primary use cases:

- Start and stop a timed fast with a visual countdown.
- Track an eating window that opens automatically when a fast ends.
- Log daily body weight and visualise trends over time.
- Hit the panic button instead of reaching for a snack.
- Review long-term fasting and weight statistics.

---

## 3. Installation & Platforms

Fast Wasp runs in any modern browser. No download is required.

**Installing to the home screen** (recommended): In Safari on iOS or Chrome on Android, use the browser's "Add to Home Screen" option. The app then launches in full-screen standalone mode with its own icon.

**Offline support**: After the first visit, the app is cached and works without an internet connection. The weight chart also works offline once its charting library has been fetched at least once.

---

## 4. First-Run Experience

When the app is opened for the first time (or after data has been cleared), an onboarding screen appears. It asks for your first name and shows a brief overview of features. Entering your name and continuing takes you to the fasting program selector. The name is used only for personalisation within the app.

---

## 5. Navigation

The app has five views, always accessible from the navigation bar:

| Control | Views |
|---------|-------|
| Top nav — **Fast** | Fast timer, eating window, OMAD, program selector, onboarding |
| Top nav — **Weight** | Weight log and chart |
| Top nav — **Resist** | Craving resistance (panic button) |
| Hamburger menu — **Stats** | Fasting and weight statistics |
| Hamburger menu — **Settings** | Name, weight unit, notifications, about |

---

## 6. Fasting Programs

When no program has been selected, the Fast view shows a program picker. The available programs are:

| Program | Fast | Eating window | Description |
|---------|------|---------------|-------------|
| 12:12 | 12 h | 12 h | Beginner |
| 14:10 | 14 h | 10 h | Crescendo |
| 16:8 | 16 h | 8 h | Leangains |
| 18:6 | 18 h | 6 h | — |
| 20:4 | 20 h | 4 h | Warrior |
| OMAD | 23 h | 1 h | One Meal/Day |
| Custom | 1–48 h | auto | Set hours via slider |

For the **Custom** program, the eating window is automatically calculated as the remainder of a 24-hour day (minimum 30 minutes). A fasting duration longer than 24 hours results in no eating window.

Selecting a program saves it as the default and takes you directly to the ready state for that program. The program can be changed at any time from the ready state.

---

## 7. Fast View

The Fast view's appearance depends on the current state of your fast.

### 7.1 Ready State

Shown when a program is selected but no fast is currently active. Displays:
- The selected program name and duration.
- A "Start Fasting" button.
- A list of recent completed fasts (start time, duration).

Tapping "Start Fasting" begins the fast immediately.

### 7.2 Active Fast — Timer

Once a fast has started, the view shows:

- A **circular progress ring** that fills as the fast progresses toward its target duration.
- A **HH:MM:SS countdown** showing time remaining until the target is reached.
- An **"Overtime" badge** that appears when the target has passed; the counter then switches to counting upward, showing how long past the target you have gone.
- A **"Stop Fast"** button to end the fast early or on time.
- An **"Edit Start Time"** toggle that opens an input for correcting the fast's start time (see §7.4).

A browser notification fires the moment the target is reached: "🐝 Fast complete!" (one notification per app session, even if the tab is in the background).

### 7.3 Eating Window Timer

When a fast ends, the eating window begins automatically. The same circular ring and countdown are shown, now counting down to the end of the eating window. Two actions are available:

- **"Start Fasting Now"** — ends the eating window early and immediately begins a new fast using the same program.
- **"End Eating Window"** — closes the eating window without starting a new fast, returning to the ready state.

A notification fires when the eating window ends: "⏱ Eating window closed."

### 7.4 Editing the Start Time

The "Edit Start Time" panel lets you correct the fast's recorded start time if you forgot to tap the button promptly. Validation rules:

- The date and time must be a valid value (unparseable input is rejected).
- The start time **cannot be in the future** — error: "Start time cannot be in the future."
- The start time **cannot be more than 14 days in the past** — error: "Start time too far in the past."

Tapping "Cancel" discards any changes and closes the panel without modifying the fast.

### 7.5 OMAD View

When the OMAD program is active, the Fast view is replaced by a simplified "One Meal a Day" view showing:

- An **"I Ate My Meal"** button that logs the current time as a meal.
- Time elapsed since the last logged meal.
- A progress bar toward the 23-hour target.

Each tap of "I Ate My Meal" closes the previous OMAD interval (recording it in fasting history) and opens a new one.

---

## 8. Weight View

### 8.1 Logging a Weight Entry

Two fields are shown at the top of the view:

- **Date** — defaults to today; can be changed to log a past entry.
- **Weight** — entered in the unit selected in Settings (kg or lb).

Validation rules:
- The weight field is required and must be a number.
- Weight must be at least **1** and at most **500** (in the display unit).
- Error messages appear inline below the field and clear as soon as the input changes.

### 8.2 Weight Chart

A line chart shows your weight history. Four time-range tabs are available: **1M** (1 month), **3M** (3 months), **6M** (6 months), and **All** (all time). The chart updates automatically when entries are added or removed.

### 8.3 Weight History List

Below the chart, all entries are listed in reverse chronological order. Each entry shows:
- The date.
- The recorded weight in the current display unit.
- The **day-over-day delta** (the difference from the previous entry).

Each entry has an **edit** and **delete** action. Editing opens the entry's values in the input fields for correction.

---

## 9. Stats View

### 9.1 Weight Statistics

Statistics are calculated over the **last 3 months**. If fewer than 2 entries exist in that window, all-time data is used as a fallback. Shown:

- **Delta** — total weight change over the period.
- **Percent change** — delta as a percentage of the starting weight.
- **Min / Max / Average** — the lowest, highest, and mean recorded weight.
- **Count** — number of entries in the period.
- **Trend** — a directional indicator: trending **down** if the delta is less than −0.05 kg, **up** if greater than +0.05 kg, and **neutral** otherwise.

### 9.2 Fasting Statistics

All-time fasting statistics:

- **Total fasts** completed.
- **Average fast length.**
- **Longest fast** recorded.
- **Total overtime** accumulated across all fasts.

---

## 10. Resist View (Craving Resistance)

The Resist view is the "sweets panic button." Its purpose is to give you something to tap when you feel a craving — logging the moment and building a habit of resistance.

### 10.1 The Panic Button

A large **"I RESISTED!"** button dominates the view. Each tap:
- Logs the current timestamp as a resistance event.
- Shows a random encouragement message: "💪 Strong!", "🎉 You did it!", or similar.

### 10.2 Counters

Below the button, four counters update in real time:
- **Today** — taps logged since midnight in local time.
- **This week** — taps since Monday at midnight.
- **This month** — taps since the 1st of the current month.
- **All time** — total taps ever logged.

### 10.3 Streak

A 🔥 streak banner shows how many **consecutive calendar days** (in local time) you have logged at least one resistance event. The streak includes today if you have already tapped today, and breaks the moment a day passes with no taps.

### 10.4 30-Day Heatmap

A GitHub-style grid shows the last 30 days, oldest on the left. Each cell represents one day; its shade reflects how many taps were logged on that day (darker = more taps, empty = zero).

### 10.5 Undo

An **"Undo last"** action removes the most recently logged craving event.

---

## 11. Settings

| Setting | Behaviour |
|---------|-----------|
| **Name** | Editable text; saves automatically when you press Enter or move focus away. |
| **Weight unit** | Toggle between **kg** and **lb**; saves on tap. All stored values are converted for display; internal storage always uses kg. |
| **Notifications** | Requests browser permission for Web Notifications. Required for fast-complete and eating-window-closed alerts. |
| **About** | Displays the app name and version. |

---

## 12. Data & Privacy

All data is stored **locally in your browser** using the browser's built-in storage. No data is sent to any server. There are no accounts, no analytics, and no third-party tracking of any kind.

Categories of data stored:
- **Settings** — your name, preferred weight unit, and selected fasting program.
- **Active fast** — the in-progress fast (start time, target, program).
- **Fast history** — every completed fast with its actual and overtime durations.
- **Active eating window** — the in-progress eating window.
- **Eating window history** — every completed eating window.
- **Weight entries** — date and weight for each log entry.
- **Craving events** — timestamp for each tap of the panic button.
- **OMAD state** — time of the last logged meal.

**Important limitations:**
- Clearing your browser's site data permanently deletes all Fast Wasp data.
- Data does not sync across browsers or devices.
- There is currently no export or import feature.

---

## 13. Offline Behaviour

After the first successful load, the app works entirely offline:
- All screens (Fast, Weight, Resist, Stats, Settings) are available without a network connection.
- The weight chart continues to work offline once its charting library has been loaded at least once.
- Notifications can be delivered even when the browser tab is in the background, because they are sent via the service worker.
- If the device has no connection on the very first visit, the app cannot be loaded.

---

## 14. Non-Goals (Out of Scope)

Fast Wasp intentionally does **not**:

- Sync data across devices or to the cloud.
- Provide backup or data export/import.
- Offer social features, sharing, or comparisons with other users.
- Log meals, calories, or macronutrients (beyond OMAD's single "I ate" event).
- Give dietary advice, coaching, or recommendations.
- Require a login or personal account of any kind.

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **Fast** | A timed period of not eating, tracked from the moment you tap "Start Fasting" to the moment the fast ends. |
| **Eating window** | The period after a fast during which eating is permitted; starts automatically when a fast ends. |
| **Program** | A named preset that defines the target fasting duration and eating window (e.g. 16:8). |
| **Overtime** | Time elapsed beyond a fast's or eating window's target duration. Shown as a positive counter once the target is passed. |
| **OMAD** | One Meal a Day — a program variant where a single daily meal is logged rather than a start/stop fast cycle. |
| **Active fast** | A fast that has been started but not yet ended. Only one fast can be active at a time. |
| **Streak** | The number of consecutive calendar days on which you have logged at least one craving resistance event. |
| **Craving event** | A single tap of the "I RESISTED!" panic button, recorded with a timestamp. |
