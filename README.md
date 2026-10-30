![Noted — Study Louder](https://capsule-render.vercel.app/api?type=waving&color=0:6559FF,50:8B5CF6,100:00D4FF&height=240&section=header&text=NOTED&fontSize=85&fontColor=FFFFFF&fontAlignY=38&desc=STUDY%20LOUDER.&descSize=25&descAlignY=60&animation=fadeIn)

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=21&pause=1200&color=8B5CF6&center=true&vCenter=true&width=650&lines=Turn+learning+into+something+powerful.;Create.+Practice.+Remember.+Repeat.;Your+knowledge.+Your+pace.+Your+potential." alt="Noted animated tagline" />
</p>

<p align="center">
  An AI-powered learning platform built to make studying more active, engaging, and effective.
  <br />
  Transform learning materials into study resources, challenge yourself with quizzes, and bring classrooms to life.
</p>

<p align="center">
  <a href="https://www.usenotedai.com/"><img src="https://img.shields.io/badge/EXPLORE_NOTED-6559FF?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Explore Noted" /></a>
  <a href="#-get-started"><img src="https://img.shields.io/badge/GET_STARTED-111827?style=for-the-badge&logo=github&logoColor=white" alt="Get started" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-Powered-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/AI-Enhanced-8B5CF6?style=flat-square" alt="AI enhanced" />
</p>

---

## ✨ The idea behind Noted

Studying shouldn't be limited to reading the same notes over and over.

**Noted turns learning materials into tools you can actually use to study.** Create learning resources, test your understanding, track your progress, and engage with other learners through interactive classroom experiences.

Whether you're studying independently or managing learning across a school, Noted brings your study workflow into one platform.

## 🚀 Explore the experience

<table>
  <tr>
    <td width="50%">
      <h3>🧠 AI Study Studio</h3>
      Turn notes and learning materials into useful study resources.
      <br /><br />
      <strong>Summaries · Quizzes · Flashcards · Podcasts · Video content</strong>
    </td>
    <td width="50%">
      <h3>📚 Your Learning Library</h3>
      Keep saved learning materials organised and revisit your resources when you need them.
      <br /><br />
      <strong>Saved materials · Quiz history · Progress review</strong>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>⚡ Focus &amp; Practice</h3>
      Make revision more active with focus tools, quizzes, and interactive learning experiences.
      <br /><br />
      <strong>Focused study · Knowledge checks · Practice</strong>
    </td>
    <td width="50%">
      <h3>🎮 Live Quiz Experiences</h3>
      Bring competition and collaboration into learning with quiz battles and live classroom game shows.
      <br /><br />
      <strong>Real-time interactions · Quiz battles · Game shows</strong>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🏫 School Learning</h3>
      Support school communities with tools for managing accounts, teachers, students, and quiz results.
      <br /><br />
      <strong>School administration · Student access · Results</strong>
    </td>
    <td width="50%">
      <h3>🌗 Flexible Experience</h3>
      Use Noted across desktop and mobile layouts, with light and dark themes.
      <br /><br />
      <strong>Responsive interface · Light theme · Dark theme</strong>
    </td>
  </tr>
</table>

> **Note:** Some capabilities depend on the external services and API credentials configured for a particular deployment.

## 🛠️ Built with

Noted uses a separate web client and API, with real-time functionality for interactive experiences.

| Layer | Technology |
|---|---|
| Web client | React 19, Vite, React Router |
| Styling and icons | Tailwind CSS 4, Lucide React |
| API | Node.js, Express 5 |
| Real-time communication | Socket.IO |
| Database and data models | MongoDB, Mongoose |
| Authentication | JWT |
| AI integrations | Configurable AI providers |
| Optional media services | Cloudinary, Pexels, Replicate, ElevenLabs |
| Optional supporting services | OCR.Space and email integration |

## 📋 Table of contents

- [Get started](#-get-started)
- [Environment configuration](#-environment-configuration)
- [Run Noted locally](#-run-noted-locally)
- [Available scripts](#-available-scripts)
- [Main application routes](#-main-application-routes)
- [Deployment](#-deployment)
- [Project structure](#-project-structure)
- [Contributing](#-contributing)
- [Project links](#-project-links)

---

## 💻 Get started

### Prerequisites

Before running Noted locally, make sure you have:

- **Node.js:** `^20.19.0` or `>=22.12.0`
- **npm**
- **MongoDB:** a local instance or a reachable hosted database

The client and server are separate npm projects, each with its own dependencies and lockfile.

## ⚙️ Environment configuration

Clone the repository and enter the project directory:

```bash
git clone https://github.com/mickeyweb1/Noted.git
cd Noted
```

Create your local environment files from the provided examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Core variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string for the API |
| `JWT_SECRET` | Yes | Long, private, randomly generated secret for signing authentication tokens |
| `VITE_API_URL` | Yes for local client setup | API base URL, including `/api` |
| `CLIENT_URL` | Recommended | Frontend origin used for CORS and generated links |
| `PORT` | No | API port; defaults to `5000` |
| `GAME_SHOW_OUTBOX_DIR` | Recommended for production | Directory for pending Game Show results and active match snapshots; point this to a persistent mounted disk to recover them after an API restart |

For local development, use these values where appropriate:

```env
# server/.env
PORT=5000
CLIENT_URL=http://localhost:5173

# Configure these with your actual values:
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

```env
# client/.env
VITE_API_URL=http://localhost:5000/api
```

The examples above illustrate the core settings. Keep any additional values already present in your `.env.example` files.

### Optional integrations

Configure only the services needed for the features you intend to use.

<details>
<summary><strong>🤖 AI generation providers</strong></summary>

Noted supports configurable AI providers. Configure at least one provider key:

- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `COHERE_API_KEY`
- `NVIDIA_API_KEY`
- `HF_API_KEY`

Provider model names can be overridden using:

- `GROQ_MODEL`
- `OPENROUTER_MODEL`
- `COHERE_MODEL`
- `NVIDIA_MODEL`
- `HF_MODEL`

</details>

<details>
<summary><strong>🖼️ Images and media</strong></summary>

Configure the corresponding credentials for the media features you intend to use:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PEXELS_API_KEY`
- `REPLICATE_API_TOKEN`

</details>

<details>
<summary><strong>🎙️ Audio generation</strong></summary>

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` — optional voice configuration

</details>

<details>
<summary><strong>📝 Text extraction and email</strong></summary>

For text extraction:

- `OCR_SPACE_API_KEY`

For email notifications:

- `EMAIL_USER`
- `EMAIL_PASS`

</details>

**Security:** Keep real credentials in local environment files or your hosting provider's secret manager. Never commit secrets or production credentials to Git.

---

## ▶️ Run Noted locally

Install the server dependencies:

```bash
cd server
npm ci
```

Install the client dependencies:

```bash
cd ../client
npm ci
```

### Start the API

From the repository root, open a terminal and run:

```bash
cd server
npm run dev
```

The API listens on port `5000` by default. Its root health response is available at:

[http://localhost:5000](http://localhost:5000)

### Start the web client

Open a second terminal from the repository root:

```bash
cd client
npm run dev
```

Open Noted in your browser:

**[http://localhost:5173](http://localhost:5173)**

Keep both development processes running while using the application.

## 🧰 Available scripts

### Client — `client/`

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `client/dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

### Server — `server/`

| Command | Description |
|---|---|
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API with Node.js |
| `npm run migrate:quiz-session-retention` | Run the quiz-session retention migration |

Run commands from the corresponding `client/` or `server/` directory.

## 🧭 Main application routes

The client includes the following main routes:

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/pricing` | Pricing |
| `/personal` | Personal learning product page |
| `/school` | School product page |
| `/student` | Student product page |
| `/contact` | Contact form |
| `/login` | Sign in |
| `/signup` | Account-type selection |
| `/signup/personal` | Personal account registration |
| `/signup/school-admin` | School registration |
| `/signup/school-student` | Join a school with an invite code |
| `/dashboard` | Protected learner dashboard |
| `/admin/dashboard` | Protected school administration dashboard |

The API provides authentication, AI content, quizzes, feedback, support, and contact endpoints under `/api`.

Socket.IO supports live game-show interactions.

---

## ☁️ Deployment

Deploy the client and API as separate services, and provision a MongoDB database that both can reach as required by the application architecture.

### API deployment

Configure the server's environment variables in your hosting provider. Make sure the MongoDB connection string, JWT secret, and any required service credentials are set securely.

For Game Show recovery, mount persistent storage for the API and set `GAME_SHOW_OUTBOX_DIR` to a directory on that mount. Completed result writes and active match snapshots are recovered from this directory after restart. Without a persistent mount, local files are not guaranteed to survive instance replacement or redeployment.

Set `CLIENT_URL` to the deployed frontend origin so browser requests can pass the configured CORS checks.

### Client deployment

Set `VITE_API_URL` to the deployed API base URL, including `/api`.

For example:

```env
VITE_API_URL=https://your-api-domain.example/api
```

Replace the example domain with your actual deployed API URL.

**Important:** Vite embeds `VITE_API_URL` at build time. If the API URL changes, update the variable and rebuild or redeploy the client.

## 🗂️ Project structure

```text
Noted/
├── client/
│   ├── public/                  # Static assets
│   └── src/
│       ├── auth/                # Sign-in and registration pages
│       ├── components/          # Shared UI and layouts
│       ├── context/             # Shared application state
│       ├── pages/               # Marketing, dashboard, quiz and admin pages
│       └── utils/                # API and client utilities
│
└── server/
    ├── config/                  # External service configuration
    ├── controllers/             # API handlers
    ├── middleware/              # Authentication and error handling
    ├── models/                  # Mongoose models
    ├── routes/                  # API route definitions
    ├── utils/                   # Server utilities
    └── server.js                # Express and Socket.IO entry point
```

## 🤝 Contributing

Contributions and focused improvements are welcome.

1. Fork the repository and create a branch for your change.
2. Keep changes focused and avoid committing environment files or credentials.
3. Run the relevant client lint and production build checks.
4. Open a pull request explaining the change and how you verified it.

Keep changes consistent with the existing architecture and avoid introducing unnecessary dependencies.

## 🔗 Project links

<p align="center">
  <a href="https://www.usenotedai.com/"><strong>🌐 Official website</strong></a>
  &nbsp; • &nbsp;
  <a href="https://github.com/mickeyweb1/Noted"><strong>💻 GitHub repository</strong></a>
</p>

---

<p align="center">
  <strong>Learn smarter. Practice better. Study louder. ⚡</strong>
  <br />
  <sub>Noted — making learning more active, engaging, and accessible.</sub>
</p>
