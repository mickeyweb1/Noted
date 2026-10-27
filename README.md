# Noted

Noted is an AI-powered study platform for turning learning materials into practical study resources. It serves independent learners and school communities with tools for creating and reviewing content, practicing with quizzes, and managing classroom learning.

## What you can do

- Generate study content from notes and other learning materials, including summaries, quizzes, flashcards, podcasts, and video content.
- Review saved learning materials in a personal library and track quiz results.
- Use focus tools and take part in quiz battles and live classroom game shows.
- Create school accounts, manage teachers and students, and review school quiz results.
- Use the app on desktop or mobile, with light and dark themes.

Feature availability can depend on the external services configured for your deployment.

## Technology

| Area | Stack |
| --- | --- |
| Web client | React 19, Vite, React Router |
| Styling and icons | Tailwind CSS 4, Lucide React |
| API | Node.js, Express 5, Socket.IO |
| Data and authentication | MongoDB with Mongoose, JWT |
| Integrations | Configurable AI providers, plus optional media, image, and email services |

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- MongoDB, available locally or through a hosted MongoDB service

The client and server are separate npm projects, each with its own lockfile and dependencies.

## Run locally

### 1. Get the code and install dependencies

```bash
git clone https://github.com/mickeyweb1/Noted.git
cd Noted

cd server
npm ci

cd ../client
npm ci
```

### 2. Configure environment variables

Create local environment files from the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set at least the following values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string for the API |
| `JWT_SECRET` | Yes | Private, long, randomly generated secret used to sign authentication tokens |
| `VITE_API_URL` | Yes for local client setup | API base URL, including `/api`; locally, `http://localhost:5000/api` |
| `CLIENT_URL` | Recommended | Frontend origin, used for CORS and generated links; locally, `http://localhost:5173` |
| `PORT` | No | API port; defaults to `5000` |

The API also supports optional integrations. Add credentials only for the features you intend to use:

- **AI generation:** configure at least one of `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `COHERE_API_KEY`, `NVIDIA_API_KEY`, or `HF_API_KEY`. Provider model names can be overridden with `GROQ_MODEL`, `OPENROUTER_MODEL`, `COHERE_MODEL`, `NVIDIA_MODEL`, and `HF_MODEL`.
- **Image and media features:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PEXELS_API_KEY`, and `REPLICATE_API_TOKEN`.
- **Audio generation:** `ELEVENLABS_API_KEY`; `ELEVENLABS_VOICE_ID` is optional.
- **Text extraction:** `OCR_SPACE_API_KEY`.
- **Email notifications:** `EMAIL_USER` and `EMAIL_PASS`.

The example files list the core variables and common integration keys; other supported AI provider and model options are listed above. Keep real credentials in local environment files or your hosting provider's secret manager; do not commit them.

### 3. Start the API and web client

Run each command in a separate terminal from the repository root.

**Terminal 1 — API**

```bash
cd server
npm run dev
```

**Terminal 2 — web client**

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API listens on port `5000` by default, and its root health response is available at [http://localhost:5000](http://localhost:5000).

## Available scripts

### Client (`client/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `client/dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

### Server (`server/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API with Node.js |
| `npm run migrate:quiz-session-retention` | Run the quiz-session retention migration |

## Routes

Some of the main client routes are:

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/pricing` | Pricing |
| `/personal`, `/school`, `/student` | Product and audience pages |
| `/contact` | Contact form |
| `/login` | Sign in |
| `/signup` | Choose an account type |
| `/signup/personal` | Personal account registration |
| `/signup/school-admin` | School registration |
| `/signup/school-student` | Join a school with an invite code |
| `/dashboard` | Protected learner dashboard |
| `/admin/dashboard` | Protected school administration dashboard |

The API provides authentication, AI content, quiz, feedback, support, and contact endpoints under `/api`. Socket.IO powers live game-show interactions.

## Production and deployment

Deploy the client and API as separate services, and provision a reachable MongoDB database. Configure the API's environment variables in its hosting environment. Set `CLIENT_URL` to the deployed client origin so browser requests are allowed by CORS.

Set `VITE_API_URL` to the deployed API base URL, including `/api`, in the client build environment. Vite embeds this value at build time, so update it and rebuild/redeploy the client when the API URL changes.

## Repository layout

```text
Noted/
├── client/
│   ├── public/                 # Static assets
│   └── src/
│       ├── auth/               # Sign-in and registration pages
│       ├── components/         # Shared UI and layouts
│       ├── context/            # Shared application state
│       ├── pages/              # Marketing, dashboard, quiz, and admin pages
│       └── utils/              # API and client utilities
└── server/
    ├── config/                 # External service configuration
    ├── controllers/            # API handlers
    ├── middleware/             # Authentication and error handling
    ├── models/                 # Mongoose models
    ├── routes/                 # API route definitions
    ├── utils/                  # Server utilities
    └── server.js               # Express and Socket.IO entry point
```

## Contributing

1. Fork the repository and create a branch for your change.
2. Keep changes focused and avoid committing environment files or credentials.
3. Run the relevant client lint and production build checks.
4. Open a pull request describing the change and how you verified it.

## Project links

- Repository: [github.com/mickeyweb1/Noted](https://github.com/mickeyweb1/Noted)
- Website: [usenotedai.com](https://usenotedai.com)
