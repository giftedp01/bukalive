# BukaLive: Global Live Tourism Platform, Phased Plan

The full brief is too big to build well in one go. It is split into phases that each ship something usable. Each phase keeps the current sign-in, hosting, ticketing, LiveKit streaming and admin features, and builds on them.

## Phase 0: Fix the blocker
- Give signed-in users permission to save to the events table and its related tables, so hosts can create and publish events again. Then test the Create Event form from start to finish.

## Phase 1: Global foundation and the signature journey (build first)
- **Global places:** countries, regions, cities and destinations stored as data, with map coordinates. South Africa is one country among many. Provinces are no longer the main way to browse.
- **12 global categories** (the list in the brief), each with subcategories.
- **Tourism businesses:** a public profile page with a verification status (none, pending, verified business, verified guide/operator, verified attraction, tourism organisation). Only admins can change this status.
- **Experiences:** the current events become tourism experiences, with live, upcoming and replay states, a viewer count, a destination and booking links.
- **New homepage:** "Explore the world live", Explore Live and Become a Host buttons, a large search bar, and these sections: Live Now, Starting Soon (with countdown and reminder), Explore Destinations, Popular Experiences and a world map teaser.
- **Experience page:** a large player, live status, viewer count and host with a verified badge. Next to it: chat with questions the host can mark as answered, destination information, a small map, and Book, Go There, Save, Share and Explore Nearby buttons.
- **Go There panel:** places to stay, activities, food, transport, attractions, plan a trip, then book. All of these come from listings in the same destination.
- **Destination pages:** live now, upcoming, experiences, places to stay, food, attractions, events, map, replays and plan your visit.
- **Demo content:** sample destinations, businesses and experiences across the 10 listed countries. Each is marked "Sample", and none is marked as verified.

## Phase 2: Map, travellers and replays
- **Live World Map** (Google Maps): red markers for live, yellow for starting soon and blue for recorded. It can be filtered by category, country and status, and searched. Clicking a marker opens a preview card.
- **My BukaLive:** saved experiences, saved destinations, followed hosts, reminders, recently watched and a bookings placeholder.
- **Replay library and replay pages**, each with Book and Go There buttons.
- **Simple recommendations** based on what you saved, watched and follow, such as "Because you watched safari…".

## Phase 3: Ask Buka, hosts and trust
- **Ask Buka assistant:** answers using only BukaLive's own listings, for things like nearby experiences, itineraries and similar places. It says clearly when it doesn't know something.
- **Host dashboard upgrade:** business profile, logo and gallery, scheduling, booking links and dates, managing replays, answering viewers, and analytics (viewers, peak viewers, saves, shares, booking clicks).
- **Trust and safety:** report content or a user, block a user, an admin review queue, verification management and featured experiences.

## Phase 4: Ready for later connections (screens only, nothing faked)
- A space for captions and translation on the player and in chat, marked "coming soon".
- A booking setup that can link to any booking provider later. For now, buttons open the provider's own website.

## Technical details
- New tables: countries, regions, cities, destinations (with lat/lng), categories and subcategories, businesses (verification_status, managed by admin), experiences (the existing `events` table extended with destination_id, business_id, subcategory_id, lat/lng, kind, replay_url, viewer_count, is_sample), listings (stay, food, attraction, transport, activity, linked to a destination), saves, follows, reminders, watch_history, reports, blocks, chat question/answered flags, analytics_events, booking_offers (provider-agnostic), caption_tracks.
- Every table gets permissions plus access rules. Verification and moderation fields can only be changed by admins.
- Sample rows are added in a migration and marked `is_sample = true`.
- Ask Buka uses Lovable AI, called from the server with the platform's own listings attached.
- The map uses Google Maps with app-owned markers, which needs a Google Maps connection.

After approval I'll do Phase 0 and Phase 1 in this round, then continue with the later phases.
