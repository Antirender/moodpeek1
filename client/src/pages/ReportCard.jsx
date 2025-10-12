// src/pages/ReportCard.jsx
import React, { useRef, useEffect } from "react";
import useSWR from "swr";
import { fetchJSON } from "../lib/http";
import "../styles/report.css";

/**
 * Get the start of the week in local time format (YYYY-MM-DD)
 * @param {boolean} monday Whether to use Monday as the start of the week (default: true)
 * @returns {string} Date string in YYYY-MM-DD format
 */
const startOfWeekLocal = (monday = true) => {
  const d = new Date();
  // Adjust day of week calculation based on whether Monday or Sunday is start of week
  // For Monday: 0->6, 1->0, 2->1, ..., 6->5
  // For Sunday: No adjustment needed
  const day = monday ? (d.getDay() + 6) % 7 : d.getDay();
  d.setDate(d.getDate() - day);
  
  // Format as YYYY-MM-DD in local time (not UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

function ReportCard() {
  const wrapRef = useRef(null);
  const start = startOfWeekLocal(true); // Use Monday as start of week
  
  // Use SWR for data fetching with proper error handling
  const { data, error, isLoading } = useSWR(
    `/api/insights/weekly?start=${start}`, 
    fetchJSON,
    {
      onError: (err) => {
        console.error("SWR Error in ReportCard:", err);
      },
      revalidateOnFocus: false, // Prevent unnecessary refetches
      shouldRetryOnError: true,
      errorRetryCount: 3
    }
  );
  
  // Temporary debug to check if we're getting data but showing zeros
  useEffect(() => {
    if (data) {
      console.table({
        totalEntries: data.period?.totalEntries,
        avgMood: data.moodScore?.current,
        moodDistribution: JSON.stringify(data.moodDistribution || {})
      });
      
      // Fetch debug data to verify server found entries
      fetchJSON(`/api/insights/weekly/debug?start=${start}`)
        .then(debug => {
          console.log('Debug data:', debug);
          if (debug.found > 0 && (!data.moodDistribution || Object.keys(data.moodDistribution).length === 0)) {
            console.warn('Data discrepancy: Server found entries but UI shows empty data');
          }
        })
        .catch(err => console.error('Failed to fetch debug data:', err));
    }
  }, [data, start]);
  
  const onExport = async () => {
    if(!wrapRef.current || !data) return;
    
    try {
      // Add print-specific class
      document.body.classList.add('print-one-column');
      
      // Wait for fonts to load if available
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Wait for all images to load
      const images = Array.from(wrapRef.current.querySelectorAll('img'));
      const imagePromises = images.map(img => {
        // Only create promise for already loaded images
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails
        });
      });
      await Promise.all(imagePromises);
      
      // Wait for browser to finish rendering
      await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      
      // Trigger print dialog
      window.print();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export as PDF. Please try again.");
    } finally {
      // Clean up
      document.body.classList.remove('print-one-column');
    }
  };

  // Handle loading and error states
  if (error) return (
    <article className="card contrast">
      <p>Failed to load report: {error.message || 'Unknown error'}</p>
      <button type="button" onClick={() => window.location.reload()}>Try Again</button>
    </article>
  );
  
  if (isLoading || !data) return <progress />;

  // Use defaults for any missing properties to prevent rendering errors
  const { 
    moodScore = {}, 
    moodDistribution = {}, 
    correlations = { 
      positiveActivities: [], 
      negativeActivities: [] 
    },
    dayPatterns = {},
    period = {},
    tips = []
  } = data || {};

  // Extract values with defaults to prevent NaN or null values
  const avgHappiness = moodScore.current ?? 0;
  const grade = moodScore.grade || 'C';
  const moodPie = moodDistribution || {};
  const topPositiveTags = correlations.positiveActivities?.map(a => a.activity) || [];
  const topStressTags = correlations.negativeActivities?.map(a => a.activity) || [];
  const weatherEffects = { temp: 'neutral', humidity: 'neutral' };

  // Check if there's any mood data
  const hasMoodData = Object.values(moodPie).reduce((sum, count) => sum + (count || 0), 0) > 0;

  const GradeBadge = () => (
    <span className="m-badge" data-mood={
      grade === 'A' ? 'happy' : grade === 'B' ? 'calm' : grade === 'C' ? 'neutral' : grade === 'D' ? 'sad' : 'stressed'
    }>{grade}</span>
  );

  return (
    <main className="container">
      <header className="row-between">
        <h2>Weekly Mood Report</h2>
        <button type="button" onClick={onExport}>Export PDF</button>
      </header>
      
      <div ref={wrapRef} id="reportCard">
        <p className="date-range">
          {period.start ? new Date(period.start).toLocaleDateString() : start} → 
          {period.end ? new Date(period.end).toLocaleDateString() : new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </p>

        <section className="grid-2">
          <article className="card">
            <h3>Weekly Grade</h3>
            {hasMoodData ? (
              <>
                <p style={{ fontSize: "2rem" }}><GradeBadge /> <strong>{typeof avgHappiness === 'number' ? avgHappiness.toFixed(2) : '0.00'}</strong></p>
                <small className="muted">Average Happiness Score</small>
              </>
            ) : (
              <p className="no-data">No data this week</p>
            )}
          </article>

          <article className="card">
            <h3>Mood Distribution</h3>
            {hasMoodData && Object.keys(moodPie).length > 0 ? (
              <ul>
                {Object.entries(moodPie).map(([k, v]) => (
                  <li key={k}><span className="m-badge" data-mood={k}>{k}</span> — {(Number(v) * 100).toFixed(0)}%</li>
                ))}
              </ul>
            ) : (
              <p className="no-data">No data this week</p>
            )}
          </article>
        </section>

        <section className="grid-2">
          <article className="card">
            <h3>Positive Triggers</h3>
            {hasMoodData && Array.isArray(topPositiveTags) && topPositiveTags.length > 0 ? (
              <ul>{topPositiveTags.map(t => <li key={t}>✅ {t}</li>)}</ul>
            ) : (
              <p className="no-data">No positive triggers found this week</p>
            )}
          </article>
          
          <article className="card">
            <h3>Stress Triggers</h3>
            {hasMoodData && Array.isArray(topStressTags) && topStressTags.length > 0 ? (
              <ul>{topStressTags.map(t => <li key={t}>⚠️ {t}</li>)}</ul>
            ) : (
              <p className="no-data">No stress triggers found this week</p>
            )}
          </article>
        </section>

        <section>
          <article className="card">
            <h3>Weather Effects</h3>
            {hasMoodData ? (
              <p>
                Temperature: {weatherEffects && weatherEffects.temp ? 
                  (weatherEffects.temp === 'up' ? '↑ Improves' : 
                  weatherEffects.temp === 'down' ? '↓ Worsens' : '— Neutral') : '— Neutral'}, 
                Humidity: {weatherEffects && weatherEffects.humidity ? 
                  (weatherEffects.humidity === 'up' ? '↑ Improves' : 
                  weatherEffects.humidity === 'down' ? '↓ Worsens' : '— Neutral') : '— Neutral'}
              </p>
            ) : (
              <p className="no-data">No weather correlation data available</p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

// Add error boundary
export class ReportErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Report card error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <article className="container">
          <h2>Something went wrong.</h2>
          <p>We couldn't load the weekly report. Please try again later.</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </article>
      );
    }

    return this.props.children;
  }
}

// Wrap the ReportCard with its own ErrorBoundary
const ReportCardWithErrorBoundary = (props) => (
  <ReportErrorBoundary>
    <ReportCard {...props} />
  </ReportErrorBoundary>
);

export default ReportCardWithErrorBoundary;
