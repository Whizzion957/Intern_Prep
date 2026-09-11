# IITR Interview Questions Platform

A collaborative platform for IIT Roorkee students to share and learn from interview experiences. Students can add interview questions, OA questions, and search through submissions from their peers.

## Features

- **Google Sign-In** - Login with your IIT Roorkee Google account (@iitr.ac.in only)
- **Access Control** - Superadmins choose which departments can log in, plus per-email allow/block lists
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
- **Authentication**: Google Sign-In (ID token verified on the server)
- **File Storage**: Cloudinary
- **Styling**: Vanilla CSS with CSS Variables

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Google OAuth client ID (see [Google Sign-In setup](#google-sign-in-setup))
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
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLIENT_URL=http://localhost:5173
SUPER_ADMIN_EMAILS=name_x@cs.iitr.ac.in
```

**Client (.env)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
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

## Google Sign-In Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
   (add other maintainers under **IAM & Admin → IAM** so the setup isn't tied to one person).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and
   support email, keep only the default scopes (`openid`, `email`, `profile`), then
   **Publish app** (moves it from Testing to In production; no Google review is needed for
   these scopes).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://intern-at-iitr.vercel.app`, `http://localhost:5173`, `http://localhost`
   - No redirect URIs needed
4. Put the client ID in `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client).

Only verified Google accounts on `iitr.ac.in` or a department subdomain
(e.g. `name@cs.iitr.ac.in`) can log in. The department is read from that subdomain.
Superadmins manage access rules in **Admin Panel → Access Control**.

### Migrating from Channel-i

Run once against the production database before deploying:

```bash
cd server
node scripts/migrateToGoogleAuth.js
```

Existing users are matched by their institute email, so their roles and contributions carry over.

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
│   ├── config/                # DB, Cloudinary, Redis config
│   ├── controllers/           # Route handlers
│   ├── middleware/            # Auth middleware
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   └── utils/                 # Seed script
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/google` - Log in with a Google ID token
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
