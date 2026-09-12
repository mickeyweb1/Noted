# 📚 Noted | study.butlouder

> **Transforming how our nation learns, one note at a time.**

Noted is a modern, full-stack AI-powered study dashboard designed to transform messy lecture notes, textbooks, and recordings into actionable audio summaries, interactive quizzes, and focused study sessions. Built to bridge the education gap, it empowers students, schools, and parents with world-class, accessible learning tools.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)

---

## ✨ Key Features

### 🤖 AI-Powered Learning
- **AI Summaries & Transcripts**: Instantly convert dense text into crisp, structured study materials.
- **Audio Learning**: Generate podcast-style audio summaries or study tracks with background beats.
- **Interactive Quizzes**: Auto-generate multiple-choice questions to test comprehension instantly.
- **Video Storyboards**: Turn notes into animated educational video scripts with AI-sourced visuals.

### 🎯 Student Productivity
- **Focus Time**: Customizable Pomodoro-style timer with ambient sounds and global background music.
- **Battle Arena**: Gamified learning where students can challenge classmates or share invite links for quiz battles.
- **Smart Library**: A centralized, searchable archive of all generated notes, quizzes, and media.
- **Progress Tracking**: XP system, study streaks, and daily focus logs to keep students motivated.

### 🛡️ School & Admin Tools
- **Role-Based Access**: Dedicated dashboards for Personal Users, School Students, and School Administrators.
- **Student Management**: Admins can easily add students, generate unique invite codes, and track class performance.
- **Feedback System**: In-app feedback modal with direct email notifications to administrators.

### 🎨 Modern UI/UX
- **Responsive Design**: Fully adaptive layout with a collapsible mobile sidebar and desktop-optimized workspace.
- **Dark/Light Mode**: Seamless theme toggling with persistent user preference (OKLCH color palette).
- **Accessibility**: Built with shadcn/ui principles for a clean, keyboard-navigable, and accessible interface.

---

## 🛠️ Tech Stack

| Category       | Technologies Used                                                                 |
|----------------|-----------------------------------------------------------------------------------|
| **Frontend**   | React 18, Vite, React Router DOM, React Context API                               |
| **Styling**    | Tailwind CSS v4, shadcn/ui, CSS Variables                                         |
| **Backend**    | Node.js, Express.js, JWT Authentication, Rate Limiting, Helmet                    |
| **Database**   | MongoDB (Mongoose)                                                                |
| **AI & Media** | Groq API, ElevenLabs (TTS), Replicate (Video), Pexels (Stock Media), OCR.space  |
| **Utilities**  | Lucide React (Icons), Axios, Nodemailer, Fluent-FFmpeg, Cloudinary                |

---

## 🚀 Getting Started

Follow these instructions to get a local copy of the project up and running.

### Prerequisites
- **Node.js** (v18 or higher)
- **npm**, **yarn**, or **pnpm**
- A **MongoDB** database URI (local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mickeyweb1/Noted.git
   cd Noted

2. **Install Backend Dependencies:**
   cd server
   npm install

3. **Install Frontend Dependencies:**
   cd ../client
   npm install

4. **Set Up Environment Variables:**
**Create a .env file in both the server and client directories.**
**server/.env**
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   CLIENT_URL=http://localhost:5173
   
   # AI & External Services
   GROQ_API_KEY=your_groq_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   PEXELS_API_KEY=your_pexels_key
   REPLICATE_API_TOKEN=your_replicate_token
   OCR_SPACE_API_KEY=your_ocr_key
   
   # Email Notifications
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASS=your_16_char_gmail_app_password

**client/.env**

5. **Start the Development Servers:**
**Terminal 1 (Backend):**
   cd server
   npm run dev

**Terminal 2 (Frontend):**
   cd client
   npm run dev

6. **View the App:**
**Open your browser and navigate to http://localhost:5173.**

**📂 Project Structure**
Noted/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Global state (User, Music)
│   │   ├── pages/          # Route components (Dashboard, Auth, Marketing)
│   │   └── utils/          # API instances and helpers
│   └── package.json
├── server/                 # Backend Node.js Application
│   ├── config/             # Database and AI service configurations
│   ├── controllers/        # Route logic and business logic
│   ├── middleware/         # Auth protection, error handling, rate limiting
│   ├── models/             # Mongoose schemas (User, Content, Feedback)
│   ├── routes/             # API endpoint definitions
│   └── server.js           # Express application entry point
└── README.md

**🤝 Contributing**
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

**📄 License**
Distributed under the MIT License. See LICENSE for more information.

**📬 Contact**
Noted AI Team
📧 Email: hello@notedstudy.com
🌐 Project Link: https://github.com/mickeyweb1/Noted
   "Building the nation's brightest minds starts here." 🇳🇬


### 💡 Why this README is better:
1. **Professional Badges**: Adds instant visual credibility at the top.
2. **Clear Value Proposition**: The tagline and "About" section immediately tell investors, principals, or developers *why* this app matters.
3. **Organized Features**: Groups features logically (AI, Productivity, Admin, UI) so it's easy to scan.
4. **Full-Stack Accuracy**: Includes the backend, database, and environment variable setup, which is crucial for anyone (or you, on a new machine) trying to run the app.
5. **Project Structure**: Gives a quick mental map of how the codebase is organized.
6. **Polished Formatting**: Uses tables, code blocks, and blockquotes to make it highly readable and visually appealing on GitHub. 

*(Note: I also fixed the small typo in your original draft where it said `cd clinet` instead of `cd client`)*. 

Save this, commit it, and push it to GitHub. Your repository is going to look incredibly professional! 🚀



