# WortTrek 🚀

**WortTrek** is a high-performance vocabulary trainer designed for English-to-German language acquisition. Developed on **Nobara Linux**, the app focuses on **User Experience (UX)** and **Learning Psychology**, moving beyond simple flashcards by implementing a smart, multi-state feedback system.

---

## 💎 Project Vision
WortTrek is built to create a "Flow-State" learning environment. As the **Project Architect**, I manage the logic, design, and roadmap to ensure the app solves real-world learning frustrations through:
* **Weighted SRS (Spaced Repetition System):** Prioritizes "Hard Words" by increasing their frequency based on performance.
* **Multi-State Feedback (FBK 4.2):** A unique system distinguishing between perfect answers, lenient matches (typos), and errors.
* **Native-Feel UX:** Smooth animations and a sliding drawer system designed for mobile-first interaction.

---

## 🛠 Technical Stack & Environment
* **OS:** Developed and managed within **Nobara (Fedora-based) Linux**.
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, and CSS3.
* **Logic:** Custom weighting algorithms for error tracking and "Umlaut" normalization.
* **Storage:** Persistent data engine using `localStorage`.



---

## 🚀 Key Features

### 🧠 Smart Checking Logic
* **Lenient Checking:** Auto-forgiveness for capitalization and common typos to keep the user focused on the language, not the keyboard.
* **Dynamic Weighting:** Tracks "Wrong Counts" to intelligently resurface difficult words.

### 🎨 Feedback System (v2.6)
* **The Green Flow:** 1s auto-advance for perfect matches.
* **The Amber Peek:** 1.5s auto-advance for small typos, showing the correction without stopping the session.
* **The Red Drawer:** A sliding modal for errors that requires manual acknowledgement to ensure active learning.

---

## 📜 Development History
I maintain a rigorous development process. You can view the full history of features, bug fixes, and refactors here:

👉 **[View the WortTrek Changelog](./CHANGELOG.md)**

---

## 📈 Roadmap (FBK Backlog)
I manage the app's evolution through a structured **Feedback (FBK)** system:
* **FBK 1.5:** Ghost Typos (Re-testing lenient words).
* **FBK 4.4:** Offline-First / PWA implementation.
* **FBK 5.12:** Listening Drills (TTS interaction).
* **Trek Mode:** A 30-word session challenge with detailed end-of-trek statistics.

---

## 👤 About the Project Architect
I am a 30-year-old aspiring **Fachinformatiker** using WortTrek as a primary project to master software lifecycle management. I specialize in **AI-augmented engineering**, where I define the system architecture, UX states, and logic flows, leveraging AI tools to accelerate the building process.

---
*Built with precision on Nobara Linux.*
