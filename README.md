
# 📘 **NyayaSahayak – AI Judicial Assistance Platform**

NyayaSahayak is an **AI-powered judicial assistance system** designed to make legal understanding accessible, efficient, and user-friendly.  
It helps users analyse legal documents, understand constitutional queries, map case relationships, and gain awareness of judicial procedures — powered by modern UI and LLM integration.

---

## 🚀 **Features**

### 🔹 **1. Introduction**
A clean overview page that introduces users to the platform and its capabilities.

### 🔹 **2. Case Intake & Triage**
- Smart form-based intake system  
- Classifies user case details  
- Suggests relevant legal pathways

### 🔹 **3. Document Analysis**
- Upload legal documents  
- Extract summaries, issues, clauses  
- AI-generated insights powered by LLMs

### 🔹 **4. Constitution AI (Chatbot)**
- Conversational assistant  
- Answers constitutional and legal queries  
- Uses the Gemini API or compatible LLM

### 🔹 **5. Legal Tech Hub**
A centralized library of tools and legal resources for students, lawyers, and general users.

### 🔹 **6. Case Relationships & Judicial Timeline**
- Graph-based relationship visualization  
- Timeline showing case progress or legal events

### 🔹 **7. Judicial Awareness**
Educational modules to enhance legal literacy and awareness.

### 🔹 **8. Litigant Feedback**
Users can share their experience and provide system feedback.

---

## 🧠 **Tech Stack**

- **React** + **TypeScript**
- **Vite** (lightning-fast frontend tooling)
- **CSS / TailwindCSS / Custom UI** (depending on implementation)
- **Gemini API (LLM Integration)**  
  Add your `GEMINI_API_KEY` in `.env.local`

---

## 📂 **Project Structure (Suggested Overview)**

```
NyayaSahayak/
│
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # All 7 main pages of the platform
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API calls, AI integrations
│   ├── assets/            # Images, icons, styles
│   ├── App.tsx            # Main router + layout
│   └── main.tsx           # Root entry
│
├── public/                # Static assets
├── index.html             # Root HTML
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies and scripts
```

---

## ⚙️ **Installation & Setup**

### **1. Clone the Repository**
```bash
git clone https://github.com/ayush-kumar-21/NyayaSahayak.git
cd NyayaSahayak
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Add Environment Variables**
Create a `.env.local` file:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

### **4. Run the App**
```bash
npm run dev
```

Your app should now be live at:  
👉 `http://localhost:5173`

---

## 🔧 **Build for Production**

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

---

## 📸 **Screenshots**
Add your screenshots in a `/screenshots` folder and link them like:

```
![Home Page](./screenshots/home.png)
![Document Analysis](./screenshots/doc-analysis.png)
```

---

## 🤝 **Contributing**

Contributions are welcome!

1. Fork the repository  
2. Create a feature branch  
3. Commit your changes  
4. Open a pull request  

---

## 📄 **License**

MIT License © 2025

---

## ⭐ **Support the Project**
If you find this useful, consider starring the repo!

