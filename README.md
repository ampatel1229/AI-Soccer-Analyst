# ⚽ AI Soccer Analyst

AI Soccer Analyst is an interactive AI scouting platform that analyzes soccer footage from YouTube and Hudl, then generates evidence-backed reports for both player and team evaluation.

I built this project to make soccer analysis more structured, useful, and explainable. Instead of simply summarizing a video, the platform turns match footage or highlight clips into scouting reports with confidence levels, timestamped evidence, strengths, development areas, and role-specific views for coaches, recruiters, and players.

The goal was to create a scouting workflow that feels practical. A coach might want detailed tactical and development notes, a recruiter might want a high-signal summary, and a player might want feedback they can actually use to improve. AI Soccer Analyst organizes the same analysis in different ways so each user can get the information that matters most to them.

## 📦 Technologies

- TypeScript
- Next.js App Router
- React
- Tailwind CSS
- Supabase
- Gemini API
- Anthropic API
- yt-dlp
- ffmpeg
- pdf-parse

## ✨ Features

### 🔍 Dual Analysis Modes

AI Soccer Analyst supports two main types of analysis:

- **Player Analysis**
  - Evaluates an individual player from highlight clips or match footage.
  - Identifies likely positions, strengths, development areas, and play-style traits.

- **Team Analysis**
  - Analyzes broader team structure and playing style.
  - Helps identify likely formations, tactical patterns, and team-level strengths or weaknesses.

### 🎥 Video Source Intake

- Source URL validation for YouTube and Hudl links
- Video ingestion through public match or highlight URLs
- Team auto-detection from URL metadata and video titles
- Manual override option when auto-detection is incomplete or incorrect

### ⚙️ Job Pipeline

The app tracks each analysis job through a clear status lifecycle:

- `queued`
- `downloading`
- `analyzing`
- `complete`
- `failed`

This makes the workflow easier to follow and helps users understand where their report is in the process.

### 📋 Scouting Report Output

Generated reports include:

- Likely positions or likely team structure
- Overall confidence score
- Confidence calibration
- Style summary
- Strengths with evidence timestamps
- Development areas with evidence timestamps
- Insufficient-evidence flags when the footage does not support a strong conclusion

The evidence-first structure is one of the most important parts of the project. I wanted the reports to feel trustworthy, so key claims are connected back to specific timestamps instead of being presented as unsupported AI-generated opinions.

### 👥 Role-Based Views

The same report can be viewed through different perspectives:

- **Coach View**
  - Full tactical and developmental detail
  - More complete notes for training, review, and player development

- **Recruiter View**
  - High-signal summary
  - Focused on traits, potential, and quick evaluation

- **Player View**
  - Growth-focused feedback
  - Clear strengths and improvement areas written in a more player-friendly way

### 💬 Scout AI Chat

Scout AI Chat lets users ask follow-up questions after a report is generated.

It can:

- Answer questions based on the uploaded report and evidence context
- Support general soccer questions
- Return citations when referencing report evidence
- Help users explore the analysis in a more interactive way

This makes the platform feel less like a static report generator and more like a scouting assistant.

### 🚂 Purdue Women’s Soccer Intel Section

The project also includes a Purdue women’s soccer intelligence section with:

- 2025 season context
- Roster and position distribution
- Player-by-player provisional reports
- Source links for additional context

This section was added to explore how scouting tools could combine general AI analysis with a more specific team or program context.

### 📤 Sharing and Exporting

- Shareable report page
- Export and print action for generated reports
- Cleaner report format for reviewing or sending analysis to others

## ⌨️ Keyboard Shortcuts

No custom keyboard shortcuts are currently implemented.

## 🧠 The Process

I built this project as an end-to-end scouting workflow. The process starts with intake from public match or highlight links, then moves through URL validation, video ingestion, job tracking, AI analysis, evidence extraction, and final report generation.

A major focus was making the output feel reliable. I did not want the system to just produce a polished paragraph that sounded confident. I wanted each important insight to be connected to evidence, so I structured the reports around timestamped references, confidence scores, and insufficient-evidence flags.

I also added both player and team analysis because soccer scouting is not only about individual traits. Sometimes the bigger question is how a team plays, what structure they use, or how certain tactical patterns show up during a match.

After the report generation flow was working, I added role-based views so the same analysis could be useful for different audiences. Coaches, recruiters, and players all look for different things, so the platform adapts the report presentation depending on who is reading it.

Finally, I added Scout AI Chat and the Purdue women’s soccer intel section to make the app more interactive. Instead of only reading a report, users can ask questions, explore context, and dig deeper into the analysis.

## 📚 What I Learned

This project taught me how to design an AI pipeline that balances flexibility and reliability. I learned how to combine video processing, structured data extraction, and LLM-generated analysis into one workflow.

I also learned how important confidence calibration is. AI-generated insights can sound convincing even when the evidence is limited, so adding confidence scores and insufficient-evidence flags helped make the final reports more honest and useful.

Another major takeaway was learning how to design for different user roles. A coach, recruiter, and player may all care about the same footage, but they need the information presented differently. Building role-specific report views helped me think more carefully about how AI tools should adapt to the user instead of forcing everyone into one format.

This project also gave me more experience working with Supabase, Next.js App Router, AI APIs, video-processing tools, and full-stack product design.

## 🔧 How It Can Be Improved

- Add async/background workers with queue infrastructure for larger scale
- Add clip extraction for each timestamped evidence point
- Add multi-report comparison:
  - Player vs player
  - Team vs team
- Add user authentication
- Add saved analysis history dashboards
- Add deeper evaluation and testing harnesses for model consistency
- Add stronger live data connectors beyond curated Purdue context
- Improve report export formatting
- Add more advanced team tactical analysis
- Add film-room style review tools for coaches and players

## 🚀 Running the Project

```bash
git clone <repo-url>
cd "AI Soccer Analyst"

cp .env.example .env

# Add your Supabase, Gemini, and Anthropic API keys

npm install
npm run dev
```

Then open the local development server:

```bash
http://localhost:3000
```

## 📝 Notes

AI Soccer Analyst is still evolving, but the main goal is to build a scouting tool that is useful, explainable, and practical. The project is not just about using AI to summarize soccer videos — it is about creating a workflow where insights are tied to evidence, confidence is clearly communicated, and the final report is useful for real scouting and player development conversations.
