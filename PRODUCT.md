# Living+: Product

> Working name. Living+ is the resident-facing brand. The assistant is **Ask Living+**.

## Context
Built for the Masters Union take-home (Senior AI Full-Stack Engineer), **Track A**: find a real problem, build a live AI-native product end to end, and show a credible path to a $10M business. 7-day build.

## The problem
Gated communities in India are full of neighbours who never meet. The founder lived in a society for years and barely spoke to anyone.

Existing society apps (MyGate, NoBrokerHood, ADDA, ApnaComplex) are built for the **gate and accounting**, sold to the committee. The resident experience is an afterthought:
- **Ads inside notifications.** MyGate pushes ads through the same channel used for gate approvals, with no way to turn them off except paying.
- **Important notices get buried** under promotional notifications.
- **Privacy fears.** Residents, including in Gurgaon, have complained to their RWAs about data collection and visitor logs.
- **Bloat.** 250+ features, yet weak community, marketplace and events.
- Nothing is designed to help residents actually connect.

**One-line pitch:** *Existing apps manage the gate. Living+ builds the community.*

**Positioning:** a premium, AI-native resident experience layer that sits alongside the society's existing gate app. We do not build gate or visitor management in v1.

## Principles (apply to every feature)
1. **No ads, ever**, especially not in notifications. Local-business promotions only appear in a clearly labelled section of the feed.
2. **Critical-only push.** Only critical items (gate, emergencies, own bookings/payments) push immediately. Everything else goes into one daily AI digest.
3. **Privacy-first.** Profiles and interests are opt-in (`is_visible` default false). Flat numbers are hidden by default (`show_flat` default false). Collect only what's needed.
4. **Warm, human feel.** This is a neighbourhood, not an ERP.
5. **AI is the core, not a bolt-on.** Agents do real work; risky actions wait for a human.

## Users and roles
| Role | Who | Can do |
|---|---|---|
| Owner | Owns and lives in a flat | Everything a resident can |
| Tenant | Rents a flat | Everything a resident can |
| Landlord | Owns a flat, may not live there | Resident features; rent tracking (later) |
| Committee | RWA / management committee member | Approve members, events, stalls, hall bookings, agent actions; upload society documents; manage amenities and vendors |
| Admin | Living+ staff | Platform support |

Users join a society with an **invite code**, pick tower, flat and role, and stay **pending** until a committee member approves them.

## Features

### Community (hero feature)
- **Mini communities (groups):** anyone can start one (FIFA gamers, runners, dog parents, book club). Each has a feed, members and events. Groups can be public or private (private = join request).
- **WhatsApp group directory:** society WhatsApp groups listed with name, topic and member count. Users *request to join*; the group admin approves; only then is the invite link revealed. We only link to WhatsApp; we can't read groups.
- **Society feed:** local news and issues; posts, comments, reactions.
- **People:** opt-in profiles with interests.
- **Connection agent:** "4 people in Tower B also play FIFA. Start a Saturday night?"

### Events: three types
| Type | Examples | Flow |
|---|---|---|
| Free | FIFA night, match watch party, movie night | RSVP, capacity limit, reminders. Publishes immediately |
| Paid (commercial) | Dance workshop in the community hall, course in the amphitheatre | Paid tickets via Razorpay; platform commission. Needs committee approval |
| Society-hosted | Diwali mela, festival celebration | Run by the committee; residents apply for **food stalls**, pay a stall fee, get a spot |

- If an event uses a society space (hall, amphitheatre), it creates a linked amenity booking.
- **Event agent:** "Plan a World Cup final watch party for 30 people": checks venue availability, suggests a time, drafts the event, invites matching residents; books the space after approval.
- **Stall allocation:** reviews applications, avoids duplicates (not five chaat stalls), assigns spots; committee approves.

### Amenities
- Live status for gym, pool, courts, hall, amphitheatre (quiet / moderate / busy / closed), plus gym equipment notes.
- Booking with **fair-use rules** (slot length, max hours per week, advance window). Hall and amphitheatre bookings need committee approval.
- Natural-language booking through the assistant: "book badminton court for me and 3 friends Saturday 7pm".

### Ask Living+ (society concierge, RAG), built last
- Answers questions from the society's bylaws, notices and meeting minutes, **with citations**.
- Says "I couldn't find this in your society's documents" rather than guessing.
- Examples: "Can I do renovation on Sunday?", "Who is the plumber vendor?", "What did the AGM decide on parking?"

### Help desk
- Residents raise complaints by text or photo.
- **Ops agent:** classifies category and priority, detects duplicates ("12 people reported the lift"), suggests a vendor, writes updates. Committee approves anything that costs money.

### Marketplace (light)
- List, browse and contact the seller for second-hand items.

### Committee console (web, light)
- Approve members, events, stalls, hall bookings and agent actions; upload documents; manage vendors and amenities.

## Human approval required (agents must pause)
- Anything that spends money
- Booking the community hall or amphitheatre
- Messaging more than 10 residents at once
- Approving or rejecting members

## Scope for the 7-day build
**Deep:** auth, roles and society join; community (groups, WhatsApp directory, connection agent); all three event types with Razorpay and stalls; amenities booking; concierge RAG; ops agent; tracing, evals, rate limits.

**Light:** feed, profiles, help-desk UI, marketplace, committee console, AI daily digest.

**Cut (README only):**
- Rent and landlord payments: real money movement brings RBI payment-aggregator rules; would use Razorpay subscriptions/autopay later.
- Gate and visitor management: out of scope; we sit alongside existing gate apps.
- Host payouts: Razorpay Route later; the demo collects payments in test mode.
- Phone OTP login: needs an SMS provider; email/password + Google for now.
- Enterprise custom features: a services line, not in the build.

## Demo society (seed data)
"Sector 50 Residency", Gurgaon, invite code `AANGAN50`, towers A–D, about 20 residents with realistic Indian names and varied interests (FIFA, running, cricket, dance, cooking, books, dogs, yoga). Test login `demo@aangan.app` (owner, Tower C) and `committee@aangan.app`. The data should feel lived-in: upcoming events, bookings, active groups, a few open tickets.
