# Study Sets

## What is included

The student dashboard's **Study Sets** page creates a private, source-linked learning set containing:

- Summarized and comprehensive notes
- Flashcards scheduled with the server's existing SM-2 review algorithm
- An eight-question practice quiz
- A short study plan
- A text tutor with Simple Explanation, Exam, and Deep Dive modes

Source material remains attached to the owner's set. Sets are not published or added to the public SEO sitemap.

## Implementation priorities

1. **One source → complete Study Set:** implemented for pasted text, PDF/DOCX/PPTX uploads, images, and YouTube videos with available transcripts.
2. **Grounded tutor:** implemented as per-set text chat with Simple Explanation, Exam, and Deep Dive modes.
3. **Spaced repetition:** implemented using SM-2; set cards are also visible in the account's existing revision queue.
4. **Unified study experience:** implemented as one responsive page with notes, cards, practice quiz, tutor, mastery, and a study plan.
5. **Ingestion improvements:** implemented document extraction, OCR fallback, upload caps, and YouTube captions. Lecture recording transcription and specialized handwriting recognition remain future work because no recording/transcription provider is configured.

## Architecture

1. `POST /api/study-sets` accepts pasted text or a YouTube URL. YouTube transcripts are fetched from the supplied video ID; videos without accessible captions return an actionable error.
2. `POST /api/study-sets/upload` extracts PDF, DOCX, and PPTX text using `officeparser`; images use the shared OCR service with an in-browser Tesseract fallback.
3. The controller checks the user's effective plan, spends credits atomically, calls the configured provider through `generateWithGroq`, validates the response, and stores the result in `StudySet`.
4. `GET /api/study-sets` and `GET /api/study-sets/:id` are owner-scoped. The tutor and flashcard review routes also require authentication and ownership.
5. Flashcard review schedules are stored on the set and included in `/api/revision/due` and `/api/revision/stats`, so the existing revision queue remains the single review surface.

No database migration is required; Mongoose creates the collection and indexes automatically.

## Plan usage

- Generating a complete Study Set costs **8 AI credits** (one per generated practice question), checked and spent against the user's effective existing plan.
- Each tutor response costs **1 AI credit**.
- If generation or persistence fails, the generation charge is refunded. Tutor provider/save failures are also refunded.
- Existing plan resolution handles free, paid, teacher, and school accounts. Credit totals are still defined centrally in `server/config/plans.js`.
- The existing `/api/study-sets` AI rate limiter also caps request volume.

## Limits and configuration

- Source text is limited to 50,000 characters; uploads are limited to 8 MB.
- Supported document uploads are PDF, DOCX, and PPTX. Image OCR needs `OCR_SPACE_API_KEY` for the preferred service; the browser fallback may need network access to load Tesseract assets.
- YouTube videos must expose a transcript/captions supported by `youtube-transcript`.
- The existing AI provider keys and models in the server configuration are reused. No new AI credentials are required.
- The server adds `officeparser` for document extraction and `youtube-transcript` for captioned YouTube videos. PDF.js is pinned to a Node-compatible release.
- A tutor is prompted to use only the set's source and notes and to acknowledge when the material does not contain an answer. Like all generative AI, this is a grounding instruction, not a mathematical guarantee; students should verify consequential facts.
