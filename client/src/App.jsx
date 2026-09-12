import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ThemeProvider, useAuth } from './context';
import { Navbar } from './components';
import {
  LoginPage,
  PortalChoice,
  Dashboard,
  AddQuestion,
  ViewQuestions,
  QuestionDetail,
  MySubmissions,
  EditQuestion,
  AdminPanel,
  Companies,
  CompanyDetail,
  BetaRestricted,
  ActivityLogs,
  Contributions,
  Resources,
  AddResource,
  ResourceDetail,
  EditResource,
} from './pages';
// Saviour - academic materials module (self-contained, see saviour/)
import saviourRoutes from './saviour';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper. `withNav={false}` is for full-page screens that
// stand on their own, like the portal chooser shown right after sign-in.
const ProtectedRoute = ({ withNav = true }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
        <style>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--background);
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!withNav) {
    return <Outlet />;
  }

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
};

// Public route wrapper (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
        <style>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--background);
          }
        `}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  return children;
};

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route path="/beta-restricted" element={<BetaRestricted />} />

        {/* Portal chooser: protected, but without the app navbar */}
        <Route element={<ProtectedRoute withNav={false} />}>
          <Route path="/portal" element={<PortalChoice />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddQuestion />} />
          <Route path="/questions" element={<ViewQuestions />} />
          <Route path="/questions/:id" element={<QuestionDetail />} />
          <Route path="/questions/:id/edit" element={<EditQuestion />} />
          <Route path="/my-submissions" element={<MySubmissions />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/logs" element={<ActivityLogs />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/add-resource" element={<AddResource />} />
          <Route path="/resources/:id" element={<ResourceDetail />} />
          <Route path="/resources/:id/edit" element={<EditResource />} />

          {saviourRoutes}
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
