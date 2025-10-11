import React, { useState, useRef } from 'react';
import Topbar from '../components/Topbar';
import ReportCard from '../components/reports/ReportCard';
import LineChart from '../components/charts/LineChart';
import TagBarChart from '../components/charts/TagBarChart';
import ReportsHelp from '../components/ReportsHelp';
import { useWeeklyInsights, formatDateForAPI } from '../api/insights';
import { formatDate } from '../components/charts/utils';
import '../styles/charts.css';

export default function ReportPage() {
  // State for selected week
  const [currentDate, setCurrentDate] = useState(new Date());

  // Format date for API call
  const formattedDate = formatDateForAPI(currentDate);
  
  // Fetch insights data
  const { data: report, error, isLoading } = useWeeklyInsights(formattedDate);
  
  // Navigate to previous/next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };
  
  // Format date range for display
  const getDateRangeText = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 6);
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Function to handle print report
  const printRef = useRef<HTMLDivElement>(null);
  
  const printReport = async () => {
    if (!printRef.current) return;
    
    try {
      // Add print-specific class
      document.body.classList.add('print-one-column');
      
      // Wait for fonts to load if available
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Wait for all images to decode
      const images = printRef.current.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
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
    } catch (err) {
      console.error('Error during print preparation:', err);
    } finally {
      // Clean up
      document.body.classList.remove('print-one-column');
    }
  };

  return (
    <div className="page-container">
      <Topbar />
      <div className="container">
        <div className="header-actions mb-l">
          <h1>Weekly Report</h1>
          <button 
            onClick={printReport}
            className="print-button"
            aria-label="Print weekly report as PDF"
          >
            Export PDF
            <span className="helper-text">Use system dialog to save as PDF</span>
          </button>
        </div>
        
        <ReportsHelp defaultOpen={false} />
        
        <div className="card">
          <div className="row-between mb-l">
            <h2>{getDateRangeText()}</h2>
            <div className="row gap-s navigation-controls">
              <button 
                onClick={() => navigateWeek('prev')}
                className="btn-icon"
              >
                <span className="sr-only">Previous Week</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => navigateWeek('next')}
                className="btn-icon"
                disabled={new Date(currentDate) >= new Date()}
              >
                <span className="sr-only">Next Week</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <div id="report-print" ref={printRef} className="report-grid">
            {/* Report Card - 1/3 width on large screens */}
            <div className="report-sidebar">
              <ReportCard 
                report={report} 
                isLoading={isLoading}
                error={error?.message}
              />
            </div>
            
            {/* Charts - 2/3 width on large screens */}
            <div className="report-charts">
              {report && report.moodDistribution && (
                <>
                  {/* Line Chart */}
                  <div className="chart-card">
                    <h3 className="mb-m">Mood Trend</h3>
                    {isLoading ? (
                      <div className="bg-gray-100 animate-pulse h-48 rounded-md"></div>
                    ) : (
                      <div className="h-48">
                        {report && report.period ? (
                          <p className="text-center text-gray-500 py-16">
                            Not enough data points for visualization
                          </p>
                        ) : (
                          <p className="text-center text-gray-500 py-16">
                            No mood data available for this period
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Activity Impact */}
                  <div className="chart-card">
                    <h3 className="mb-m">Activity Impact</h3>
                    {isLoading ? (
                      <div className="bg-gray-100 animate-pulse h-48 rounded-md"></div>
                    ) : (
                      <div className="h-48">
                        {report && report.correlations && (report.correlations.positiveActivities?.length > 0 || report.correlations.negativeActivities?.length > 0) ? (
                          <TagBarChart 
                            positiveActivities={report.correlations.positiveActivities || []}
                            negativeActivities={report.correlations.negativeActivities || []}
                          />
                        ) : (
                          <div className="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="muted">No activity data available</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {!report?.moodDistribution && !isLoading && (
                <div className="chart-card">
                  <div className="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 12H4M12 4v16m8-8a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                    <p className="muted mb-s">No mood entries found for this week</p>
                    <p className="muted">Add entries to generate insights and visualizations</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}