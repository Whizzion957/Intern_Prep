# IITR Interview Questions Platform

A collaborative platform for IIT Roorkee students to share and learn from interview experiences. Students can add interview questions, OA questions, and search through submissions from their peers.

## Features

- **Channel-i OAuth Authentication** - Login with your IIT Roorkee credentials
- **Add Questions** - Share interview/OA questions with company, result, and suggestions
- **Search & Filter** - Search by company, branch, name, question text, and more
- **Sort Options** - Sort by year, company, student name, date added
- **Company Management** - Auto-complete company search with logo uploads
- **Dark/Light Mode** - IITR branded theme with toggle
- **Admin Panel** - Super admin can manage users and add questions for any student

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Express.js 5
- **Database**: MongoDB
- **Authentication**: Channel-i OAuth 2.0
- **File Storage**: Cloudinary
- **Styling**: Vanilla CSS with CSS Variables

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Channel-i OAuth credentials
- Cloudinary account

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd Intern_Questions
```

2. Install dependencies:
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. Set up environment variables:

**Server (.env)**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/Intern-App
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CHANNELI_CLIENT_ID=your-channeli-client-id
CHANNELI_CLIENT_SECRET=your-channeli-client-secret
CHANNELI_REDIRECT_URI=http://localhost:5000/api/auth/callback
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLIENT_URL=http://localhost:5173
SUPER_ADMIN_ENROLLMENT=23114001
```

**Client (.env)**
```env
VITE_API_URL=http://localhost:5000/api
```

4. Seed the database with companies:
```bash
cd server
npm run seed
```

5. Start the development servers:
```bash
# Backend (from /server)
npm run dev

# Frontend (from /client)
npm run dev
```

## Project Structure

```
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Auth & Theme context
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service
│   │   └── styles/            # Global CSS
│   └── ...
├── server/                    # Express Backend
│   ├── config/                # DB, Cloudinary, Channel-i config
│   ├── controllers/           # Route handlers
│   ├── middleware/            # Auth middleware
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   └── utils/                 # Seed script
└── README.md
```

## API Endpoints

### Auth
- `GET /api/auth/login` - Get Channel-i auth URL
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Companies
- `GET /api/companies` - List companies (with search)
- `POST /api/companies` - Create company (with logo)
- `PUT /api/companies/:id/logo` - Update company logo

### Questions
- `GET /api/questions` - List questions (with search, filters, sort, pagination)
- `GET /api/questions/:id` - Get single question
- `GET /api/questions/my` - Get current user's questions
- `POST /api/questions` - Create question
- `PUT /api/questions/:id` - Update own question
- `DELETE /api/questions/:id` - Delete own question

### Admin
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/role` - Update user role
- `POST /api/admin/questions` - Add question for any user
- `GET /api/admin/stats` - Dashboard stats

## Deployment

### Vercel (Frontend)
1. Connect your repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL`

### Backend (Render/Railway)
1. Connect your repository
2. Set root directory: `server`
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables

## License

MIT - Made with ❤️ for IIT Roorkee students
