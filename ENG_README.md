# MoeFlow Frontend Project
[![GitHubStars](https://img.shields.io/github/stars/moeflow-com/moeflow-frontend)]()
[![GitHubForks](https://img.shields.io/github/forks/moeflow-com/moeflow-frontend)]()
[![Chinese README](https://img.shields.io/badge/README-Chinese-red)](README.md)
[![English README](https://img.shields.io/badge/README-English-blue)](ENG_README.md)

**Due to some API code adjustments, please update the MoeFlow backend to Version 1.0.1 before continuing to use.**

## Deployment

For non-developers, it is recommended to refer to [moeflow-deploy](https://github.com/moeflow-com/moeflow-deploy) and use Docker and docker-compose for deployment.

## Tech Stack

- Core
  - react
  - react-router // Routing
  - emotion // CSS in JS
  - react-intl // i18n
  - redux
    - react-redux
    - redux-saga // Side effects handling
  - immer.js // Immutable object handling
- UI
  - antd
  - antd-mobile
  - classnames
  - fontawesome
- Other
  - pepjs // Pointer event polyfill
  - bowser // Browser detection
  - why-did-you-render // Performance optimization
  - lodash // Utility library
  - uuid
  - fontmin // Font minification

## Local Development

1. Install the recent LTS version of Node.js, such as v18 or v20.
2. Run `npm install` to install dependencies.
3. Run `npm start` to start the Vite development server.
    - The development server includes API reverse proxying. By default, requests to `localhost:5173/api/*` are forwarded to `localhost:5000/*` (local moeflow-backend development version address).
    - This configuration can be modified in `vite.config.ts`. For instance, you can use a public server instead of the local moeflow-backend.
4. Run `npm build` to build the frontend code for production. **Note** that the backend address used will be configured in `.env`.
    - If `.env` is not created, the default value is `/api`.

If deploying on hosting services like `Vercel`, you can set `REACT_APP_BASE_URL` to the corresponding backend API address in the hosting environment variables.

## Project Configuration

If your translation team is translating from a language other than Japanese (ja) to Traditional Chinese (zh-TW), you can modify the corresponding configuration in `src/configs.tsx` (the file has comments). Common language codes include:

- `ja` Japanese
- `en` English
- `ko` Korean
- `zh-CN` Simplified Chinese
- `zh-TW` Traditional Chinese

## Version Updates

### Version 1.0.0

First open-source version of the MoeFlow frontend and backend.

### Version 1.0.1

1. Fixed some data processing and interface bugs.
2. Adjusted default initialization settings, reducing the need to modify only the environment variable `REACT_APP_BASE_URL` to point to your backend address.
3. Adjusted the directory structure for generating static files, making joint frontend and backend deployment easier.
4. Updated the "Create Team" and "Create Project" pages for smoother content submission. **(Please use the latest backend version to avoid data format issues!)**
5. Configurable website titles and other content; search for the corresponding terms in `src/locales` to modify.

### Version 1.0.3

(The final stable version of the old architecture. If you encounter issues with new versions, consider reverting to this version.)

1. Added support for setting and displaying homepage HTML/CSS.
2. Builds both linux-amd64 and linux-aarch64 images. Deployment on ARM machines is now possible.

### Version 1.1.0

1. Replaced create-react-app and webpack with Vite for build.

### Version 1.1.1

- i18n: Added English locale.
- EXPERIMENTAL: Assisted translation with manga-image-translator.
- Dependency updates.
- Minor fixes.

### Version 1.2.0 (Shoreline Custom Edition)

#### Core & Full-Stack Features
- **Independent Preview Image Compression**: Separated generation of thumbnails and resampled previews for faster loading.
- **Quick Staff Assignment on Project Cards**: Directly assign and edit project workers from project cards without navigating into details.
- **User Aliases**: Supported custom site-wide aliases, team creator overrides, and preferred display name switching.
- **Real-Time Project List Polling & Presence**: Presence heartbeat mechanism with live active editor badges and list diff change notifications.
- **Search Projects by Member / Across Project Sets**: Multi-set and cross-team project searches filtered by specific worker and role.
- **Send Proofread Draft via Email**: Trigger proofread review emails from the image translator with side-by-side diffs and CC support.
- **Import Comics from TG Bot**: Integrated with backend archive-import tasks to easily create projects from external bots like Telegram.

#### Frontend-Specific Enhancements
- **Special Character Editor**: Customizable quick-character buttons, keyboard shortcuts, and canvas-background cheatsheet guide.
- **Comprehensive Dark Mode**: Deep Dark Mode adaptation across image selector, pagination, floating badges, with anti-flash styling and image brightness adjustment.
- **Mobile Long-Press Delete Tag**: Optimized touch interactions on mobile devices to easily delete or manage tags.
- **Streamlined Keyboard Navigation**: Proofread sending hotkeys, input-focus safeguards, and smooth mode toggles.

### Version 1.2.1

- **Project Member Editor Mobile Adaptation**:
  - Fixed negative coordinate calculation on narrow screens causing off-screen clipping; switched to centered modal dialog with backdrop on mobile viewports (<= 640px).
  - Refactored full-mode role list into a horizontally scrollable tab bar on mobile, providing full screen width for the member panel.
  - Refactored simple-mode layout to single column on narrow screens (<= 480px), enhanced touch targets, and prevented text overflow.

### Version 1.2.2

- **Open Qualification Mode Recruiting Fix**: In open qualification mode, ordinary members can invite other members and assign positions without being blocked as "unqualified"; self-claimed positions keep their tags when assigned directly.
- **Proofread Textarea Avatar Overlap Fix**: Fixed the avatar obscuring text inside the image translator's proofread draft textarea.

### Version 1.2.3

- **Same-Name Member Deduplication**: Typing a name and pressing Enter in the quick worker editor (EditWorkers) now assigns the role to the first joined member with the same project display name (registered user first, then external alias) instead of stacking duplicate external records.
- **Hard Delete for External Aliases**: Added a hard-delete entry in the member list (project owner or team creator only, with a confirmation dialog) that permanently removes an external alias and frees its `(project, external_id)` unique slot.
- **Bind Flow Improvements**: External members now show the bind entry in both active and removed states; bind failures recognize both the `identityCode` string and the legacy 5109 numeric code as a concurrent-merge fallback.
- **API & i18n**: Added the `hardDeleteProjectMember` API and an `identityCode` field on the failure result type; added hard-delete related messages (zh-CN, en, messages.yaml).

### Version 1.2.4

- **Quick Worker Editor Role Row Separation**: Roles in the quick worker editor (EditWorkers) are now rendered in dedicated rows, improving readability and usability with dense member configurations.
- **Optional Frontend Module System**: Introduced a directory-presence based modular architecture under `src/modules`, providing generic slots, routes, and menu contributions while enforcing strict decoupling (C1).
- **Partner Work Search & Duplicate Check Alert**: Added partner catalogue search for conflicting works, presenting top-of-project alerts with suspected titles, progress, and retry actions.
- **Alert & Prompt Box Dark Mode Adaptation**: Fully adapted Ant Design alert boxes (`ArchiveImportProgress`, `ZitengCheckAlert`), progress bars, danger buttons, and tags to the dark theme.
- **Clear Duplicate Check Verdict Banner**: When a check determines no collision, displays a subtle, near-background green banner below the file search bar. Expands on first visit, retracts to a thin 3px green line on hover-away, and re-expands on hover without displacing card positions or blocking card interactions. On mobile, stays expanded at the top of the cards and naturally scrolls out of view.
- **State Deduplication & Full i18n**: Shared query state via `useZitengCheck` to prevent duplicate polling, with full bilingual localization across all strings.

### Version NEXT

- [diff](https://github.com/moeflow-com/moeflow-frontend/compare/v1.1.1...main)
