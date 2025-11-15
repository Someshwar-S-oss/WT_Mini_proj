# NoteVerse - Git-Based Lecture Notes Platform

A collaborative note-taking platform that applies Git version control principles to lecture notes. Built with React (TypeScript), Node.js/Express, and MongoDB.

## 🚀 Features (Fully Implemented)

- ✅ **User Authentication**: JWT-based register/login system
- ✅ **Notebook Management**: Create, edit, delete notebooks with course info
- ✅ **Monaco Editor**: Full-featured code editor with syntax highlighting
- ✅ **Version Control**: Create branches, commits with Git integration
- ✅ **File Management**: File tree navigation with folder expand/collapse
- ✅ **Commit History**: Timeline view with commit details
- ✅ **Diff Viewer**: Line-by-line changes with color coding
- ✅ **Branch Management**: Create, switch, delete branches with UI
- ✅ **Collaborative Features**: Role-based access (Owner, Editor, Viewer)
- ✅ **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C++, CSS, HTML, JSON, Markdown, and more
- ⏳ **Pull Requests**: Coming soon
- ⏳ **Real-time Collaboration**: Coming soon

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher) - Running locally or use MongoDB Atlas
- **Git** (required for Git operations on the backend)
- **npm** or **yarn**

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd WT_Mini_proj
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Configure Environment Variables

The `.env` file is already created. Update it if needed:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/noteverse
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
REPO_BASE_PATH=./repos
CORS_ORIGIN=http://localhost:5173
```

**Important**: Change `JWT_SECRET` to a secure random string in production!

#### Start MongoDB

Make sure MongoDB is running:

```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
# or
mongod --dbpath /path/to/data/directory
```

#### Run Backend

```powershell
npm run dev
```

The backend server will start on `http://localhost:5000`

**Note**: MongoDB is already running as a Windows service on your machine, so no need to start it manually.

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend
npm install
```

#### Configure Environment Variables

The `.env` file is already created with default values. Update if your backend runs on a different port:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=NoteVerse
```

#### Run Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🎯 Usage

### Getting Started

1. **Open your browser** and navigate to `http://localhost:5173`
2. **Register** a new account
3. **Create your first notebook** from the dashboard
4. **Start adding notes** and commit your changes

### Key Workflows

#### Creating a Notebook
1. Click "Create Notebook" on the dashboard
2. Enter notebook details (name, course, description)
3. Set visibility (public/private)
4. A Git repository is automatically initialized

#### Working with Branches
1. Open a notebook
2. Create a new branch for experimental notes
3. Switch between branches to work on different versions
4. Merge branches when ready

#### Committing Changes
1. Edit your notes in the editor
2. Click "Commit" when ready
3. Enter a commit message and description
4. Changes are saved to the current branch

#### Collaboration
1. Navigate to notebook settings
2. Add collaborators by email/username
3. Assign roles (Owner, Editor, Viewer)
4. Collaborators can now access the notebook

## 📁 Project Structure

```
WT_Mini_proj/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── models/         # Mongoose schemas
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic (Git service)
│   │   ├── middleware/     # Auth, permissions, error handling
│   │   ├── routes/         # API routes
│   │   ├── utils/          # JWT, logger utilities
│   │   └── server.ts       # Express app entry
│   ├── repos/              # Git repositories storage
│   └── package.json
│
├── frontend/               # React/TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context (Auth)
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript interfaces
│   │   └── main.tsx        # App entry point
│   └── package.json
│
└── git_notes_project.md    # Project documentation
```

## 🔧 Development

### Backend Development

```bash
cd backend

# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run linter
npm run lint
```

### Frontend Development

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Notebook Endpoints
- `GET /api/notebooks` - Get user's notebooks
- `POST /api/notebooks` - Create new notebook
- `GET /api/notebooks/:id` - Get notebook details
- `PUT /api/notebooks/:id` - Update notebook
- `DELETE /api/notebooks/:id` - Delete notebook

### Branch Endpoints
- `GET /api/notebooks/:id/branches` - List branches
- `POST /api/notebooks/:id/branches` - Create branch
- `DELETE /api/notebooks/:id/branches/:name` - Delete branch
- `POST /api/notebooks/:id/branches/:name/checkout` - Switch branch

### Commit Endpoints
- `GET /api/notebooks/:id/commits` - Get commit history
- `POST /api/notebooks/:id/commits` - Create commit
- `GET /api/notebooks/:id/commits/:hash` - Get commit details
- `GET /api/notebooks/:id/commits/:hash/diff` - Get commit diff

## 🔐 Security Notes

- JWT tokens are used for authentication
- Passwords are hashed with bcrypt
- Rate limiting is enabled on all API endpoints
- CORS is configured for the frontend origin
- Input validation with express-validator
- Helmet.js for security headers

## 🚀 Deployment

### Backend Deployment (Railway/Render)
1. Create a new project on Railway or Render
2. Connect your GitHub repository
3. Set environment variables
4. Deploy from main branch

### Frontend Deployment (Vercel/Netlify)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variables
5. Deploy

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- The project currently uses local Git repositories. For production, consider using a distributed file system or object storage.
- Real-time collaboration features are not yet implemented.
- Large files may cause performance issues.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Contact the development team

## 🎓 Credits

Developed as part of a Web Technologies course project.

---

**Happy Note-Taking! 📚✨**
