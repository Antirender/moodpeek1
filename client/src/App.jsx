import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import './App.css';
import './styles/semantic.css';

// Import components
import Topbar from './components/Topbar';
import ParticleBackground from './components/ParticleBackground';

// Import page components
import EntriesPage from './pages/EntriesPage';
import TrendsPage from './pages/TrendsPage';
import ReportPage from './pages/ReportPage';

// Lazy load ReportCard
const ReportCard = React.lazy(() => import('./pages/ReportCard.jsx'));

// Simple Home component
function Home() {
  return (
    <main className="container">
      <article className="grid mt-l">
        <div className="text-center card">
          <h1>Welcome to MoodPeek</h1>
          <p>
            Track your mood and discover patterns that affect your well-being.
          </p>
          <div className="grid">
            <a 
              href="/entries" 
              role="button"
            >
              Record Today's Mood
            </a>
            <a 
              href="/trends" 
              role="button"
              className="secondary"
            >
              View Trends
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <article className="container">
          <h2>Something went wrong.</h2>
          <p>We couldn't load the content. Please try again later.</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </article>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <ParticleBackground />
      <Topbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/report" element={
          <Suspense fallback={<progress/>}>
            <ReportCard />
          </Suspense>
        } />
        {/* Redirect old insights route to new trends route */}
        <Route path="/insights" element={<Navigate to="/trends" replace />} />
        {/* 404 catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
