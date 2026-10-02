# Marketing video types

A working catalog of the marketing video types `short-form-video` can
plan, and how each one actually gets made as a 9:16 short (TikTok,
Instagram Reels, YouTube Shorts). The skill reads this file in its scope
and script steps. Edit it like `brand-voice.md` if your mix differs.

For a longer survey of the formats, see Sparkhouse's
[22 Types of Video Content for Marketing](https://www.thesparkhouse.com/blog/22-types-of-video-content-for-marketing).

## How each type gets made

- **Render:** `scripts/video/render.js` makes it from text alone, as motion
  graphics (kinetic text, shapes, UI mockups) with an original soundtrack.
- **Render + your assets:** renderable, but only with real material from
  you, such as screenshots, photos, a logo, a customer's actual words, or
  real numbers. The skill asks for these and never invents them.
- **Generate:** an AI video tool (Higgsfield, Figma Weave) can produce
  footage-style shots. This spends that tool's credits.
- **Film:** needs real footage of real people or places. The skill gives
  you a phone shot list, filming tips, and edit notes instead of a
  finished video.
- **Cut-down:** a long-form format. The short is a promo or a highlight of
  it, not the thing itself.

Template names refer to `scripts/video/templates/`.

## Picking a type by goal

| Goal | Start with |
|---|---|
| Get discovered / build awareness | Ad, educational tips, brand profile, social/trend |
| Explain what you do | Explainer, product demo, how-to |
| Answer objections | FAQ, myth vs fact, comparison |
| Build trust before a purchase | Testimonial, case study, UGC, meet the team |
| Launch something / fill a date | Announcement, event or webinar promo, live promo |
| Humanize the brand | Meet the team, behind the scenes, vlog, brand story |

When the goal doesn't settle it, offer the user two or three fitting
types with a line on each rather than picking silently.

## The types

Beats are for a 20–45s short. The hook is always the first 1–3 seconds
and has to work with the sound off.

### Ad (paid or organic promo)
- **Goal:** awareness to conversion; the format most likely to be run as a paid ad.
- **Made by:** Render (`promo.html`), or Generate for footage-style shots.
- **Beats:** pain or bold claim → the product as the fix → one proof point → offer → CTA. Show the brand in the first 3 seconds, since many viewers never reach the end.

### Brand / company profile
- **Goal:** awareness; who you are, what you believe, what makes you different.
- **Made by:** Render (`promo.html`), plus your logo and real proof points.
- **Beats:** a belief or problem you exist for → what you do in one line → how you're different → proof (customer count, a known customer) → CTA.

### Brand story / brand film
- **Goal:** emotional connection; the origin or mission story.
- **Made by:** Film or Generate for the full version. Render can do a text-led "story in five lines" short.
- **Beats:** the moment it started → the problem you saw → what you did about it → where it is now → the line you want remembered.

### Explainer
- **Goal:** consideration; make the value proposition obvious.
- **Made by:** Render (`promo.html` or `how-to.html`).
- **Beats:** the problem → how it works in three simple steps → the outcome → CTA. One idea per scene, no jargon.

### Animation & motion graphics
- **Goal:** any stage; make abstract or complex ideas concrete.
- **Made by:** Render. This is the renderer's native format, so every template applies.
- **Beats:** follow whichever type the animation serves.

### Product demo
- **Goal:** consideration; show the product doing the job in a real use case.
- **Made by:** Render + your assets (`how-to.html` with real screenshots), or Film (a screen recording or the physical product).
- **Beats:** the job to be done → the product doing it, feature by feature (one per scene) → the result → CTA. Show, don't list.

### Tutorial / how-to
- **Goal:** consideration and retention; teach a specific task.
- **Made by:** Render + your assets (`how-to.html` with real screenshots), or Film (a screen recording).
- **Beats:** "How to X in N steps" → one step per scene, each with the exact tap or click → "Done" → CTA (save it, follow for more).

### Educational / tips
- **Goal:** awareness; useful on its own, so people share and save it.
- **Made by:** Render (`promo.html` as a list, or `faq.html`).
- **Beats:** a promise ("3 things I wish I knew about X") → one tip per beat → a payoff line → CTA (follow for more). Tips should be correct and specific; check facts before drafting.

### FAQ
- **Goal:** consideration; answer the question that's blocking a decision.
- **Made by:** Render (`faq.html`), or Film (someone answering on camera).
- **Beats:** the question as a comment bubble → the short answer → two or three supporting points → CTA (ask yours below). Use real questions customers actually ask.

### Myth vs fact / comparison
- **Goal:** consideration; correct a misconception or position against alternatives.
- **Made by:** Render (`faq.html`).
- **Beats:** the myth, struck through → the fact → why it matters → CTA. Never name a competitor unless `brand-voice.md` allows it, and only with claims you can back up.

### Presentation
- **Goal:** consideration; one key insight from a deck or report.
- **Made by:** Render (`promo.html`), or Cut-down from a recorded talk.
- **Beats:** the headline finding → the data behind it → what it means for the viewer → where to get the full deck or report.

### Webinar
- **Goal:** consideration; deep education and lead capture.
- **Made by:** Cut-down. Before the event, render a promo (`announcement.html`); after it, a highlight clip from the recording (Film/existing footage).
- **Beats (promo):** the topic as a question → who's speaking → what you'll learn (three points) → date and time → register CTA.

### Live stream
- **Goal:** engagement; real-time Q&A, launches, events.
- **Made by:** Cut-down. A countdown promo (`announcement.html`) before, a highlight clip after.
- **Beats (promo):** what's happening → why to show up live → date and time → set a reminder.

### Event (promo or recap)
- **Goal:** awareness and attendance; or social proof after the fact.
- **Made by:** Render for the promo (`announcement.html`). Film for the recap.
- **Beats (promo):** the event in one line → who's there → date and place → CTA. **Recap:** the best moment first → three quick highlights → "see you next year".

### Announcement / launch
- **Goal:** awareness spike; something is new, changing, or opening.
- **Made by:** Render (`announcement.html`).
- **Beats:** tease → reveal (the name, big) → what's in it (three features) → when and where → CTA.

### Interview / expert Q&A
- **Goal:** authority; borrow credibility from someone who knows.
- **Made by:** Film. Render can do a pull-quote card (`testimonial.html`) with a real, attributed quote.
- **Beats:** their most surprising line first → who they are → the question → their answer → CTA to the full interview.

### Customer testimonial
- **Goal:** trust at the decision stage.
- **Made by:** Film is strongest. Render + your assets (`testimonial.html`) works with the customer's real quote, name, role, and photo, used with their permission.
- **Beats:** the result in their words → who they are → what it was like before → what changed → CTA.
- **Never** invent, embellish, or "tighten" a quote into words they didn't say, and never use a name, photo, or logo without permission.

### Case study
- **Goal:** decision stage; proof with numbers.
- **Made by:** Render + your assets (`testimonial.html`) with the customer's real numbers.
- **Beats:** the headline result → the customer and their challenge → what they did → the results as counted-up numbers → CTA to the full story. Every number must be real and sourced.

### User-generated content (UGC)
- **Goal:** trust and reach; customers showing it in their own words.
- **Made by:** Film, by customers. You repost it with permission and add a caption; the skill can write the ask and the caption, not the video.
- **Beats:** whatever the creator made. Your caption adds the context and CTA.

### Meet the team
- **Goal:** humanize the brand; trust in who's behind it.
- **Made by:** Render + your assets (`team.html` with real photos, names, and roles), or Film (each person says one line).
- **Beats:** "The people behind X" → one person per beat, with name, role, and one human detail → the group → CTA (we're hiring, or say hi).

### Behind the scenes
- **Goal:** humanize the brand; show the process, people, or culture.
- **Made by:** Film (phone clips). It can't be faked with motion graphics.
- **Beats:** "Here's how X actually gets made" → three to five quick process shots → the finished thing → CTA.

### Vlog / day in the life
- **Goal:** humanize the brand and build a following.
- **Made by:** Film.
- **Beats:** a time-stamped hook ("6:45am, first call with a customer") → four to six moments with on-screen times → a takeaway line.

### Social / trend
- **Goal:** reach; ride a format the platform is already pushing.
- **Made by:** usually Film. Render works for text-led formats ("POV:", "Things nobody tells you about X").
- **Beats:** the trend's own structure. Check that the trend is still current before making it; this plugin can't look trends up live.

## Filming notes (for Film types)

When a type needs footage, the skill's Generation Status says so and gives
a phone shot list instead of a video:
- Shoot vertical (9:16) at 1080×1920 or higher, in daylight or facing a
  window, with the phone at eye level.
- Record audio close to the speaker (a clip-on mic if possible); viewers
  forgive soft video long before bad sound.
- Get each shot in a few takes of 3–6 seconds, plus a few seconds of
  silence before and after for cutting.
- Edit in CapCut or similar: cut on the action, add captions (most people
  watch muted), and keep the first second the most interesting one.
