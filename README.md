# Maham Hassan (Speech & Language Pathologist)

A mobile-friendly MS Speech-Language Pathology MCQ preparation website presented under the name Maham Hassan (Speech & Language Pathologist) and built from six supplied Riphah course guides.

## Included

- 6 courses
- 1,800 four-option MCQs
- MCQ-only learning flow with no separate notes or flashcards
- Immediate green feedback for a correct selection
- Immediate red feedback for a wrong selection, with the correct option shown in green
- Correct answer, definition, reasoning, SLP importance, applied example, exam tip, and option-by-option distractor review after every question
- Fundamental, intermediate, and applied questions for every concept
- Daily 36-question balanced quiz
- Course- and topic-wise practice
- Timed 25-, 50-, or 100-question mock exams
- Missed-question and starred-question review
- Progress stored locally in the learner's browser
- Clean course-first homepage and simplified navigation
- Five-tab mobile navigation designed for one-tap access
- Responsive desktop and mobile design

## Courses

1. Speech and Language Sciences
2. Language in Multicultural Populations
3. Artificial Intelligence in SLP
4. Child Development
5. Research Methodology
6. Biomedical Sciences I

## Run locally

The app has no dependencies and no build step.

1. Open `dist/index.html` directly in a browser, or
2. Run a local static server from the project root:

```bash
python -m http.server 8080 --directory dist
```

Then open `http://localhost:8080`.

## Deploy to Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare Pages, select **Create a project** and connect the repository.
3. Framework preset: **None**.
4. Build command: leave blank.
5. Build output directory: `dist`.
6. Deploy.

The `_headers` file supplies recommended security headers automatically on Cloudflare Pages.

## Deploy to GitHub Pages

The included workflow `.github/workflows/pages.yml` publishes the `dist` directory.

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Run the workflow or push to the `main` branch.

## Updating the question bank

The deployed data is stored in `dist/data.js`. The site itself uses only HTML, CSS, and JavaScript.

## Academic note

This independent revision resource is aligned to the supplied Riphah International University MS SLP course materials. It is not an official Riphah examination bank and should be used alongside lectures, prescribed readings, and instructor guidance.
