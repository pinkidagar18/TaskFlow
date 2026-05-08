CopyTaskFlow — Team Command Center

A full-stack team task management app with role-based access control, project collaboration, and a real-time dashboard.


✨ Features

Authentication — Secure JWT-based signup & login with bcrypt password hashing
Projects — Create color-coded projects, invite team members by email, manage roles
Role-Based Access Control — Admins can create/edit/delete tasks; Members can only update their own task status
Task Management — Create tasks with title, description, priority, due date, and assignee
Dashboard — Live stats: total tasks, completed, active projects, overdue items, and team leaderboard
Overdue Detection — Automatically flags tasks past their due date that aren't completed
Responsive UI — Dark-themed, glass-morphism design built with vanilla HTML/CSS/JS


🛠️ Tech Stack
LayerTechnologyFrontendHTML, CSS, Vanilla JS (single-page app)BackendNode.js + Express.jsDatabaseSQLite via sql.js (file-based, zero-config)AuthJWT (jsonwebtoken) + bcryptjsDevNodemon for hot-reloadDeploymentRailway-ready (railway.json included)

📁 Project Structure
taskmanager/
├── frontend/
│   └── index.html          # Single-page frontend app
├── backend/
│   ├── server.js           # Express server entry point
│   ├── db/
│   │   ├── database.js     # sql.js DB init & helper layer
│   │   └── taskflow.db     # SQLite database file
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   └── routes/
│       ├── auth.js         # /api/auth — signup, login, user search
│       ├── projects.js     # /api/projects — CRUD + member management
│       ├── tasks.js        # /api/tasks — CRUD with role checks
│       └── dashboard.js    # /api/dashboard — stats & analytics
├── .env.example            # Environment variable template
├── package.json
└── railway.json            # Railway deployment config

🚀 Getting Started
Prerequisites

Node.js v18+
npm

1. Clone the repository
bashgit clone https://github.com/your-username/taskflow.git
cd taskflow/taskmanager
2. Install backend dependencies
bashcd backend
npm install
3. Configure environment variables
Copy the example file and fill in your values:
bashcp ../.env.example backend/.env
Edit backend/.env:
envJWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=5000
DB_PATH=./backend/db/taskflow.db
4. Start the development server
bashnpm run dev
The app will be live at http://localhost:5000

🔑 API Reference
Auth — /api/auth
MethodEndpointDescriptionPOST/signupRegister a new userPOST/loginLogin and receive JWTGET/meGet current user profileGET/users?email=Search users by email
Projects — /api/projects
MethodEndpointDescriptionGET/List all user's projectsPOST/Create a new projectGET/:idGet project details + membersDELETE/:idDelete project (admin only)POST/:id/membersAdd a member by emailDELETE/:id/members/:uidRemove a member (admin only)
Tasks — /api/tasks
MethodEndpointDescriptionGET/List tasks (filter by project, status, priority)POST/Create a task (admin only)GET/:idGet a single taskPUT/:idUpdate task (admins: full edit; members: status only)DELETE/:idDelete task (admin only)
Dashboard — /api/dashboard
MethodEndpointDescriptionGET/Get stats: totals, by-status, by-priority, overdue tasks, team breakdown

🔐 Roles & Permissions
ActionAdminMemberCreate tasks✅❌Edit any task field✅❌Update own task status✅✅Delete tasks✅❌Manage project members✅❌View all project tasks✅✅

🗄️ Database Schema
The SQLite database contains three core tables:

users — id, name, email, hashed password, created_at
projects — id, name, description, color, created_by, created_at
project_members — project_id, user_id, role (admin | member), joined_at
tasks — id, title, description, priority, status, due_date, project_id, assigned_to, created_by, timestamps

🤝 Contributing

Fork this repository
Create your feature branch: git checkout -b feature/my-feature
Commit your changes: git commit -m 'Add my feature'
Push to the branch: git push origin feature/my-feature
Open a Pull Request


📄 License
MIT — feel free to use, modify, and distribute