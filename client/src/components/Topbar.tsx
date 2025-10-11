import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from "./ThemeToggle";

export default function Topbar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'primary' : 'secondary';
  };
  
  return (
    <nav className="container-fluid">
      <ul>
        <li><Link to="/" className="contrast"><strong>MoodPeek</strong></Link></li>
      </ul>
      <ul>
        <li>
          <Link 
            to="/entries" 
            className={isActive('/entries')}
          >
            Entries
          </Link>
        </li>
        <li>
          <Link 
            to="/trends" 
            className={isActive('/trends')}
          >
            Trends
          </Link>
        </li>
        <li>
          <Link 
            to="/report" 
            className={isActive('/report')}
          >
            Report
          </Link>
        </li>
        <li><ThemeToggle /></li>
      </ul>
    </nav>
  );
}