---
name: terraquest-frontend
description: Design and implement TerraQuest's distinctive, mobile-first exploration frontend. Use for React UI, visual design, interactive maps, discovery quests, skill trees, memory journals, local-first experiences, PWA behavior, and integration with the existing FastAPI backend.
---

# TerraQuest Frontend Design and Engineering

Act as the design lead and senior frontend engineer for TerraQuest, a real-world exploration platform built around curiosity, observation, personal memories, and open-source AI.

The product helps people discover the world around them through exploration maps, AI-guided side quests, a Discovery Skill Tree, and the signature experience "One Thing You Almost Missed."

The goal is not to build another generic dashboard. Build a distinctive digital field journal that makes people want to put their phones away and explore.

## 1. Ground every design decision in TerraQuest

Before designing a screen, establish:

- Its primary user.
- The user's current goal.
- The real-world action the screen should encourage.
- The minimum information required to complete that action.
- The next useful step after completion.

Design around real product concepts: field notes, topographic maps, observation journals, discovery markers, expedition cards, and skill progression.

Use this context to make specific visual choices. Do not reuse an arbitrary dashboard template.

## 2. Visual identity

Develop a cohesive visual language inspired by outdoor field journals, cartography, natural textures, and exploration games.

Suggested direction:

- Forest green and deep evergreen for navigation and primary actions.
- Moss and muted sage for discovery and progress.
- Warm paper tones for journal surfaces.
- Charcoal for readable text.
- Restrained amber or brass for achievements and meaningful highlights.

Treat these as starting points, not mandatory colors. Choose final color tokens deliberately and apply them consistently.

Use a distinctive display typeface, a highly readable body typeface, and a restrained utility style for coordinates, dates, labels, and statistics. Avoid excessive font variety.

Create a clear type scale, spacing system, border treatment, icon language, and responsive layout system.

Avoid generic purple gradients, excessive glassmorphism, unnecessary neon, excessive rounded cards, and decorative elements unrelated to exploration.

## 3. The signature visual idea

Make TerraQuest's map and field journal the recognizable elements of the product.

The exploration map should communicate the difference between places the user has discovered and places they have yet to explore.

The Memory Atlas should feel like a personal collection of field notes, photographs, and meaningful observations.

The Discovery Skill Tree should communicate learning and progression, not merely display four generic progress bars.

The "One Thing You Almost Missed" experience should feel quieter and more reflective than the rest of the application. Use focused layouts, clear questions, generous spacing, and restrained transitions.

Choose one memorable visual signature and keep the remaining interface disciplined.

## 4. Plan before implementation

Work in two passes.

### Pass A: Design plan

Before writing UI code, create a compact design plan containing:

- Product-specific visual direction.
- A palette of four to six named colors with hex values.
- Display, body, and utility typography choices.
- Spacing and layout rules.
- Mobile and desktop navigation concepts.
- Component styling.
- A description of the signature visual element.
- Short ASCII wireframes for the main application and signature quest.
- A brief explanation of why the design fits TerraQuest.

Review the plan against the product requirements. If it looks like a generic travel app or AI dashboard, revise it before implementation.

### Pass B: Build and critique

Implement the revised design consistently.

After implementation:

- Review the hierarchy of each screen.
- Check alignment, spacing, typography, and readability.
- Remove decorative elements that do not help the user.
- Check narrow mobile layouts.
- Verify focus states and keyboard navigation.
- Respect reduced-motion preferences.
- Inspect screenshots if the environment supports them.
- Fix the most important visual and usability issues before declaring the work complete.

Do not stop at a design plan or static mockup. Deliver functional UI.

## 5. Product experience and information architecture

Build the application around these destinations:

- Explore: a concise starting point for the next adventure.
- Map: exploration progress, discovered cells, and location markers.
- Quests: available side quests, instructions, and completion.
- Skill Tree: Visual Explorer, Nature Tracker, Sound Hunter, and Urban Explorer.
- Memories: the personal Memory Atlas.
- Settings: preferences, AI status, privacy, and storage management.

Use desktop navigation where it improves efficiency and compact mobile navigation where it improves accessibility.

Keep the next meaningful action visually obvious.

Do not make users navigate through multiple dashboard screens just to start a quest.

## 6. Signature quest design

Treat "One Thing You Almost Missed" as a first-class product experience.

The flow is:

1. Invite the user to notice something ordinary.
2. Encourage them to put their phone away and explore.
3. Let them optionally capture a photo.
4. Ask what they noticed.
5. Ask why it caught their attention.
6. Optionally ask what they might otherwise have missed.
7. Present a short AI-assisted reflection when available.
8. Save the discovery and award the appropriate progression.
9. Offer one optional follow-up quest.

Each step should have one clear purpose.

Use plain, human language. Never force a photo, location permission, or every reflection answer.

Do not make the experience feel like a lengthy form or a chatbot conversation that keeps the user on screen.

## 7. Discovery Skill Tree

Design four distinct but cohesive branches:

- Visual Explorer: patterns, color, composition, and detail.
- Nature Tracker: plants, wildlife, and natural surroundings.
- Sound Hunter: environmental listening and soundscapes.
- Urban Explorer: architecture, public spaces, and overlooked details.

Show progress, levels, unlocked challenges, and completed quests using actual application data.

Use meaningful visual differences between locked, available, and completed states.

Avoid misleading animations or progress that does not reflect real quest completion.

## 8. API-first engineering

The existing FastAPI backend is the source of truth for server-side records.

Before integrating a screen:

- Inspect the backend README and OpenAPI specification.
- Verify endpoint paths and request and response schemas.
- Identify authentication and ownership requirements.
- Use the actual API contracts.
- Do not invent endpoints or fabricate successful responses.

Centralize API communication in typed service modules.

Keep UI components separate from API logic, local storage, and domain rules.

Use the existing stack when possible. For a new frontend, prefer React, TypeScript, and Vite.

Do not rebuild the backend to accommodate a visual design decision.

If an endpoint is missing, document the gap and use only a truthful, clearly identified local fallback when appropriate.

## 9. Local-first data and AI

Use localStorage for lightweight preferences and IndexedDB for photos and larger local records.

Keep personal photos and reflections local unless the user explicitly chooses to upload or synchronize them.

Do not assume that a local image reference can be opened by another user.

Use the existing backend AI endpoints and report provider status accurately. Do not claim inference runs on a mobile device when it actually runs through Ollama on another machine.

Do not introduce paid AI APIs.

The interface must handle unavailable models, offline states, storage failures, and backend errors gracefully.

## 10. Maps and privacy

Use the backend's actual map, discovery, and sharing contracts.

- Respect private, unlisted, and public visibility.
- Never expose private reflections or precise coordinates in shared views.
- Request location permission only when needed.
- Provide manual check-in alternatives.
- Handle unavailable map tiles.
- Distinguish actual discovered-cell counts from region-relative percentages.
- Make sharing and revocation explicit.
- Do not claim that an action succeeded until the backend confirms it.

## 11. Writing and interface language

Write from the user's perspective.

Use short, specific labels and active voice.

Prefer "Save discovery" over "Submit."

Prefer "Create share link" over "Share data."

Use the same terminology throughout the application.

An empty state should explain what the user can do next. An error should explain what failed and how to recover.

Avoid generic marketing copy inside functional screens.

Keep the tone curious, calm, encouraging, and grounded in real-world exploration.

## 12. Accessibility and responsive quality

- Use semantic HTML and accessible form labels.
- Maintain sufficient contrast.
- Provide visible keyboard focus.
- Ensure controls work with a keyboard and touch.
- Respect reduced-motion preferences.
- Avoid communicating state through color alone.
- Handle narrow screens and device safe areas.
- Avoid horizontal overflow.
- Keep touch targets comfortably sized.
- Do not rely on hover for essential mobile functionality.

## 13. Project structure and preservation

Keep the repository organized:

- `backend/` contains the existing FastAPI application.
- `frontend/` contains the React application.
- `.agents/skills/terraquest-frontend/SKILL.md` contains this skill.

Preserve the working backend, its environment, dependencies, database configuration, and API contracts.

Do not move, delete, or rewrite existing backend files unless migration is explicitly required and has been carefully verified.

Keep frontend dependencies separate from Python dependencies.

Keep backend secrets out of frontend environment variables.

## 14. Final quality check

Before completing a task:

- Verify the real user journey, not just the appearance.
- Check all navigation, buttons, and forms.
- Verify API integration and authentication.
- Check loading, empty, offline, and error states.
- Check map-sharing privacy.
- Test the signature quest end to end.
- Test the skill tree after completion.
- Run available linting, type checks, tests, and production builds.
- Report what was actually tested and what remains incomplete.

Build with a distinctive point of view, but prioritize clarity, accessibility, privacy, and real functionality.

**TerraQuest's design principle: make the digital experience beautiful enough to invite exploration, then simple enough to let people leave the screen behind.**# TERR AQUEST — COMPLETE FRONTEND BUILD PROMPT

Use the `/terraquest-frontend` skill throughout this task.

You are building the complete frontend for TerraQuest, a real-world exploration platform powered by local AI.

The backend is already completed. Your job is to build the frontend from beginning to end, connect it to the existing backend, and verify that all important workflows work.

**Do not rebuild the backend. Do not create a disconnected mockup. Do not stop after making a landing page.**

## PHASE 1 — REPOSITORY INSPECTION

Before coding:

1. Inspect the entire repository.
2. Locate the completed FastAPI backend and the existing frontend directory, if any.
3. Read the backend README, API routes, Pydantic schemas, authentication implementation, and Swagger/OpenAPI specification.
4. Identify the real API endpoints for authentication, maps, discoveries, quests, AI, skills, exploration, synchronization, and sharing.
5. Determine the correct request payloads, response schemas, authentication headers, and error behavior.
6. Inspect existing dependencies and preserve working code.
7. Create a frontend implementation plan and immediately proceed with implementation.

Do not invent endpoints or request fields. If an expected endpoint does not exist, document the limitation and implement the best supported experience without pretending the backend supports it.

## PHASE 2 — FRONTEND TECHNOLOGY

Use the following stack for a new frontend, unless a working frontend already uses a compatible alternative:

- React
- TypeScript
- Vite
- Tailwind CSS, if appropriate
- React Router
- Leaflet and React Leaflet for interactive maps
- Lucide icons
- IndexedDB for photos and larger local records
- localStorage for lightweight preferences and guest-mode settings
- Fetch API or the existing HTTP client for backend communication

Avoid unnecessary libraries.

Create a clear architecture with reusable UI components, typed API services, hooks, feature modules, and validation.

Suggested structure:

frontend/
    src/
        app/
        components/
        pages/
        features/
            auth/
            exploration/
            maps/
            discoveries/
            quests/
            skills/
            sharing/
            settings/
        services/
            api-client.ts
            auth-api.ts
            maps-api.ts
            discoveries-api.ts
            quests-api.ts
            skills-api.ts
            sharing-api.ts
        hooks/
        lib/
        storage/
        types/
        styles/
        main.tsx
    public/
    .env.example
    package.json

Adapt this structure to the existing project.

Configure the API base URL using a Vite environment variable, such as:

VITE_API_BASE_URL=http://127.0.0.1:8000

Use the actual backend address and route prefix discovered during inspection.

Never hardcode a production server address throughout the application.

## PHASE 3 — VISUAL IDENTITY

Create a distinctive, polished, mobile-first experience.

Product identity: TerraQuest.

Core message:

"Explore the world. Notice the little things. Build your own atlas of discovery."

Design direction:

- Deep forest green, moss, warm cream, charcoal, and restrained golden accents.
- Cartographic details, subtle topographic textures, and elegant map markers.
- Premium typography and excellent spacing.
- A combination of modern outdoor exploration tools and a personal field journal.
- Smooth, purposeful transitions.
- Beautiful empty states and meaningful loading states.
- Dark and light themes if practical.

The interface must not resemble a generic admin dashboard or generic AI chatbot.

Make mobile the primary design target. Ensure the experience works at 320–360 CSS pixels wide and scales naturally to larger screens.

Create a consistent navigation system:

Desktop:
- Sidebar or compact navigation.
- Main content area.
- Map and discovery views with sufficient space.

Mobile:
- Compact header.
- Bottom navigation for the primary destinations.
- Touch-friendly controls.
- Full-screen or bottom-sheet interactions where appropriate.
- Proper safe-area support.

Primary destinations:

1. Explore
2. Map
3. Quests
4. Skill Tree
5. Memories

Account settings and sharing controls should be accessible without overcrowding the navigation.

## PHASE 4 — ONBOARDING AND AUTHENTICATION

Create an attractive onboarding flow.

Ask users to choose:

- Display name.
- Interests: photography, nature, sounds, architecture, local history, and mindful observation.
- Preferred quest duration: 5, 10, 15, or 30 minutes.
- Preferred difficulty.
- Whether they want to enable location access.

Allow users to skip optional questions.

Offer guest exploration without forcing account creation.

Use the real authentication APIs discovered in the backend.

If registration and login are available, implement:

- Registration page.
- Login page.
- Session management.
- Logout.
- Protected account pages.
- Clear authentication errors.
- A safe return to the intended page after login.

Do not introduce email login if the backend uses username and password.

Do not implement fake authentication.

Use a secure session strategy compatible with the existing backend. If the backend uses bearer tokens, follow its actual contract and avoid storing sensitive tokens in URLs or logs.

If a refresh endpoint is absent, handle session expiration cleanly rather than inventing one.

Guest data must remain available in local storage until the user chooses to synchronize it, where supported.

## PHASE 5 — EXPLORER HOME

Create a functional home dashboard that includes:

- Greeting and current exploration level.
- Compact exploration map preview.
- Prominent "Begin an Expedition" action.
- Featured "One Thing You Almost Missed" quest.
- Current skill progression.
- Recent discoveries.
- Completed quest count.
- Recent exploration activity.
- A short suggestion for the next adventure.

Populate server-backed values using real API responses.

For guest mode, show the actual local guest state.

Display useful empty states for a new user. Do not fill the dashboard with invented history or fake statistics.

The primary action should lead directly to a quest or exploration activity, not another dashboard.

## PHASE 6 — EXPLORATION MAP AND FOG OF WAR

Build an interactive map using Leaflet and an appropriate OpenStreetMap-compatible tile provider.

Implement:

- Current location when permission is granted.
- Manual check-in when location is unavailable.
- Discovered cells.
- Visited locations.
- Memory markers.
- Quest-related markers when supported.
- Exploration progress.
- Map legend.
- Discovery details on marker selection.
- A map settings panel.
- Loading, permission-denied, and offline states.

Use the real map APIs to fetch and update server-backed map information.

Implement the discovered-cell layer using the backend's actual cell format and statistics.

Distinguish clearly between:
- Areas recorded as explored.
- Areas that have not been explored.
- Locations the user manually marked.
- Locations with verified data from an available source.

Do not invent GPS verification or claim that the entire world has been explored.

If the backend exposes region-relative percentages, display the relevant region and denominator. Otherwise, show meaningful counts rather than a fabricated world-exploration percentage.

Users must be able to explore without GPS permission.

Respect private, unlisted, and public map visibility.

When map tiles fail to load, keep local memories and other supported features usable.

## PHASE 7 — MEMORY ATLAS

Create a beautiful memory journal in both gallery and map views.

Each discovery can contain:

- Photo.
- Title.
- Description.
- Observation.
- Personal reflection.
- Date.
- Optional location.
- Related quest.
- Skill category.
- Visibility.

Allow users to:

- Create a memory.
- Take a photo or select one from their device.
- Edit a memory.
- Delete a memory.
- Open its location on the map.
- Filter by category, date, and quest.
- View related discoveries.

Use IndexedDB for photo blobs and device-local memory records.

Use localStorage only for small settings and preferences.

When the backend supports synchronization, synchronize only the records the user has chosen to sync.

Do not assume an IndexedDB photo reference is accessible from another device. For a shared photo, require a real backend-accessible image URL or upload mechanism supported by the backend.

If photo uploads are not implemented by the backend, keep the photo local and explain that the image will not appear on a friend's device. Never fabricate an image URL.

Support private memories and explicit sharing controls.

## PHASE 8 — THE SIGNATURE QUEST

Implement the complete **"One Thing You Almost Missed"** experience.

This is the emotional center of TerraQuest.

### Screen 1: The invitation

Display:

"Today, look for something you would normally walk past."

Explain that the user can complete the quest nearby, without traveling far or visiting a special destination.

Display the expected duration and a Start Quest button.

### Screen 2: Explore

Show minimal instructions.

Encourage the user to put the phone away and observe the real world.

Do not force the app to remain open while the user explores.

### Screen 3: Capture

Allow the user to:

- Take a photo.
- Select an existing photo.
- Continue without a photo.

### Screen 4: Reflect

Ask the questions one at a time:

1. What did you notice?
2. Why did it catch your attention?
3. What might you have missed if you had not slowed down?

Allow users to skip optional questions.

### Screen 5: AI reflection

Call the actual backend AI reflection endpoint if available.

Generate a short, thoughtful response that reflects the user's observation without inventing facts or pretending to know their emotions.

Show the response source accurately if the backend reports whether the local model or deterministic fallback was used.

If AI is unavailable, allow the quest to continue without blocking completion.

### Screen 6: Preserve the discovery

Save the observation and reflection using the actual backend discovery or quest-completion APIs, while keeping device-local photos local unless the user explicitly uploads or shares them.

Award XP only through the backend's authoritative completion flow for authenticated users.

For guest users, maintain local progression.

### Screen 7: Celebrate

Display:

"You noticed something new. That's an adventure, too."

Show the earned XP, skill progress, and saved discovery.

Offer one optional follow-up quest.

Do not immediately trap the user in another long screen flow.

Ensure the complete quest works without GPS and without a photo.

## PHASE 9 — AI SIDE QUESTS

Build a full quest-discovery experience.

Include:

- Suggested quests.
- Quests by skill category.
- Duration filters.
- Difficulty filters.
- Quest details.
- Start quest.
- Instructions.
- Reflection prompts.
- Completion.
- Follow-up recommendations.
- Quest history.

Use the actual AI generation, recommendation, follow-up, and status APIs discovered in the backend.

Display:
- Quest title.
- Description.
- Skill category.
- Duration.
- Difficulty.
- Instructions.
- Completion criteria.

Allow users to regenerate a quest if the backend supports it.

Use loading indicators and timeouts.

If the backend AI provider is unavailable, display a curated or deterministic quest only when the backend actually returns it or the frontend has an explicitly maintained, valid fallback catalog.

Never pretend a remote model or local model was used if the response did not establish that.

Do not call a paid AI API.

## PHASE 10 — DISCOVERY SKILL TREE

Create a visually impressive and fully functional skill-tree screen.

The four branches are:

1. Visual Explorer.
2. Nature Tracker.
3. Sound Hunter.
4. Urban Explorer.

Use distinct icons, descriptions, progress bars, and connected progression nodes.

Display:

- Current level.
- Current XP.
- XP needed for the next level.
- Completed quest count.
- Unlocked quest categories.
- Related quest history.
- Recommended quests.

Use backend skill-progress APIs for authenticated users.

Use local guest progress for guest mode.

Never allow the client to grant itself server-side XP or unlock server-controlled rewards by sending arbitrary values.

Refresh progress after successful quest completion.

Include clear locked-state explanations and empty states.

## PHASE 11 — MAP SHARING WITH FRIENDS

Implement the full map-sharing interface using the existing backend.

A map owner should be able to:

- Select a map.
- Choose private, unlisted, or public visibility where supported.
- Generate a share link.
- Choose the allowed information to expose.
- Copy the link.
- View active share links.
- Revoke a share link.
- See expiration details.

Create a dedicated shared-map route.

A friend opening a valid share link should see:

- The shared map.
- Permitted exploration cells.
- Permitted discovery markers.
- Approved titles and descriptions.
- Approved photos only when their URLs are genuinely accessible.
- A clear indication that this is a shared map.

Friends should not need to log in for unlisted read-only viewing when the backend permits anonymous token access.

Respect backend permissions exactly.

Never expose private reflections, precise coordinates, hidden discoveries, authentication details, or private photo references.

Do not put sensitive information into share URLs.

Do not invent share-link expiration dates or claim a link was revoked unless the backend confirms the operation.

If the backend returns a token but not a complete URL, construct the frontend route using the documented response and application origin.

The owner must receive clear success and error feedback.

## PHASE 12 — EXPLORATION STATISTICS

Create a clean statistics screen that shows real data, including:

- Unique explored cells.
- Saved discoveries.
- Completed quests.
- Total XP.
- Skill progression.
- Recent exploration timeline.
- Activity grouped by day or week.
- Region statistics when available.

Use backend summary, timeline, and heatmap endpoints where implemented.

Avoid unnecessary chart libraries if simple visualizations are sufficient.

Clearly distinguish map exploration from quest completion.

Do not fabricate historical activity.

For guest mode, use local records and clearly identify local-only data where synchronization has not occurred.

## PHASE 13 — LOCAL-FIRST AND OFFLINE SUPPORT

Implement a sensible local-first strategy.

Use localStorage for:
- Theme.
- Onboarding preferences.
- Guest settings.
- Small UI preferences.

Use IndexedDB for:
- Photo blobs.
- Local guest memories.
- Local guest quest history.
- Local guest skill progress.
- Queued synchronization records where appropriate.

Create clear storage services rather than accessing browser storage throughout UI components.

Support:
- Storage initialization.
- Data validation.
- Storage errors.
- Duplicate prevention.
- Graceful recovery.
- Deletion of local data.

Provide a settings page where users can:
- View local storage information where practical.
- Export their memories and progress.
- Delete local data.
- Manage location permissions through the relevant browser settings.
- See AI provider status.
- Understand which features require the backend or internet.

Implement a PWA manifest and service worker if compatible with the project.

Cache the application shell and essential static assets.

Do not claim the map, backend, or LLM works offline unless it actually does.

Offline mode should preserve accessible local memories and supported guest-mode functions. Synchronization should occur only when connectivity returns and the user has opted into it.

Avoid automatic uploads of private photos and reflections.

## PHASE 14 — SETTINGS AND PRIVACY

Build a settings page with:

- Profile information.
- Interests and quest preferences.
- Theme preference.
- AI status.
- Storage information.
- Local data export and deletion.
- Map privacy defaults.
- Sharing management.
- Account logout.
- Clear privacy explanations.

Ask for location permission only when a user requests a location-dependent feature.

Never upload a photo simply because the user selected it.

Make sharing explicit and revocable.

Do not use precise location history for unrelated recommendations without consent.

## PHASE 15 — API CLIENT AND ERROR HANDLING

Create one central API client.

Requirements:

- Configurable base URL.
- Typed requests and responses.
- Appropriate authorization headers.
- Consistent JSON handling.
- Timeout and network-error handling.
- Useful error messages.
- Correct HTTP status handling.
- Session expiration handling.
- No secrets in logs.
- No fabricated successful responses.

Use the backend's actual OpenAPI contract.

Do not create separate, duplicated fetch logic inside every page.

If the backend is unreachable, display a clear offline/backend-unavailable state and preserve supported local features.

Do not silently switch authenticated server operations to local-only operations while pretending they were synchronized.

## PHASE 16 — END-TO-END TESTING

Run the project and verify the actual user journeys.

At minimum, test:

1. First-time onboarding.
2. Guest exploration.
3. Registration and login.
4. Loading real map data.
5. Manual check-in without GPS.
6. Saving a memory.
7. Taking or selecting a photo.
8. Completing "One Thing You Almost Missed."
9. Generating a quest through the backend.
10. Handling AI unavailability.
11. Completing a quest and updating XP.
12. Updating the Discovery Skill Tree.
13. Creating and revoking a share link.
14. Opening a shared map in a separate browser session.
15. Verifying private information is not exposed.
16. Reloading and preserving local preferences and guest data.
17. Handling backend errors.
18. Running the production build.
19. Checking narrow mobile layouts.
20. Checking keyboard navigation and accessible controls.

Test against the actual backend whenever it is available.

Do not replace API responses with hardcoded demo data to make the UI look complete.

Do not claim integration tests passed unless they actually ran.

## PHASE 17 — FINISHING REQUIREMENTS

The application must have:

- A coherent visual identity.
- Fully connected primary navigation.
- Functional forms and buttons.
- Real API integration.
- Loading, error, and empty states.
- Local-first storage.
- Responsive mobile layouts.
- The signature quest experience.
- The Discovery Skill Tree.
- Map exploration.
- Memory Atlas.
- Map sharing.
- Documented environment configuration.

Run the available lint, type-check, test, and build commands. Fix the errors you find.

Do not modify the completed backend unless an actual, documented incompatibility requires a change. If a backend change is necessary, stop and report the exact gap before making it.

At the end, report:
- Features implemented.
- Files created or modified.
- Backend endpoints integrated.
- Environment variables.
- Commands to start the frontend.
- Test and build results.
- Known limitations.

**Final objective:** deliver a polished, fully functional TerraQuest frontend that encourages real-world discovery, preserves personal memories, develops observation skills, and allows users to share selected parts of their exploration with friends—powered by the existing local-AI backend.