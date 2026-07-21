# OpenAI Build Week build provenance

## Submission status

- **Competition:** OpenAI Build Week
- **Track:** Education
- **Implementation window:** July 18–21, 2026 (Pacific Time)
- **Competition repository created:** July 21, 2026
- **Entrant:** SkylarWJY
- **Development workflow:** human-directed Codex sessions using GPT-5.6
- **Runtime OpenAI integration:** GPT-5.6 through the OpenAI Responses API

No pre-Build Week source code is included in this submission. The public competition
repository intentionally uses a clean, entrant-authored history so its contributor and
authorship metadata describe this submission only.

## Build timeline

### July 18, 2026

- Defined the “one question in, one world out” product thesis.
- Built the initial deterministic museum journey, Three.js renderer and Node server.
- Added public-domain artwork records, explicit rights metadata and local fallbacks.
- Established the strict-schema GPT-5.6 dialogue contract.

### July 19, 2026

- Integrated generated walkable environments and companion models.
- Added native-scale navigation, collider grounding, walk bounds and guided touring.
- Added three parallel GPT-5.6 perspectives, companion-specific lenses and visual effects.
- Added the session-grounded closing roundtable and personalized finale routing.
- Added contract tests, secret boundaries, runtime status labels and error handling.

### July 20–21, 2026

- Completed OpenAI Build Week documentation and judge instructions.
- Framed the experience as inquiry-based education for students, teachers and cultural learning organizations.
- Verified third-party rights and service disclosures.
- Ran syntax, integration and server contract checks.
- Created a clean public competition repository and independent asset release.

## Human and Codex responsibilities

The entrant defined the product concept, selected the collection and companion cast,
reviewed generated environments, chose the ethical and representation constraints, set
the acceptance bar and made final product, design and engineering decisions.

Codex using GPT-5.6 accelerated implementation, refactoring, debugging, testing and
documentation. GPT-5.6 also powers the live artwork interpretations and closing roundtable
through the OpenAI Responses API.

## Verification evidence

- `npm run check` validates runtime JavaScript syntax.
- `npm test` validates integration contracts and server public/secret boundaries.
- `docs/LATEST_PRODUCT_SPEC.md` documents the intended product behavior.
- `docs/INTEGRATIONS.md` documents external service boundaries.
- `THIRD_PARTY_NOTICES.md` documents generated assets, open-access data and licenses.
- The primary Codex `/feedback` Session ID is supplied privately in the Devpost submission.
