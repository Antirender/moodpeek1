// src/pages/ReportCard.tsx
import useSWR from "swr";
import { WeeklyReport } from "../types";
import { fetchJSON } from "../lib/http";
import { useRef } from "react";
// AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
// Reference: https://chatgpt.com/share/68fb843c-14d0-800c-9556-ae9ce9a8c1ed
// Add/remove/refine more details by myself
const startOfWeek = () => {
  const d = new Date(); 
  const day = (d.getDay() + 6) % 7; 
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

/**
 * Waits for fonts and images to be loaded to ensure proper rendering during print
 * @param containerRef - Reference to the printable container
 */
const printReport = async (containerRef: React.RefObject<HTMLDivElement | null>) => {
  if (!containerRef.current) return;
  
  try {
    // Add print-specific class
    document.body.classList.add('print-one-column');
    
    // Wait for fonts to load if available
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    
    // Wait for all images to decode
    const images = containerRef.current.querySelectorAll('img');
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

export default function ReportCard() {
  const printRef = useRef<HTMLDivElement|null>(null);
  const start = startOfWeek();
  const { data, error, isLoading } = useSWR<WeeklyReport>(
    `/api/insights/weekly?start=${start}`, 
    fetchJSON
  );
  
  const onPrintPDF = async () => {
    if(!printRef.current || !data) return;
    await printReport(printRef);
  };

  if (error) return <article className="contrast"><p>Failed to load</p></article>;
  if (isLoading || !data) return <progress />;

  const { avgHappiness, grade, moodPie, topPositiveTags, topStressTags, weatherEffects } = data;

  const GradeBadge = () => (
    <span className="m-badge" data-mood={
      grade === 'A' ? 'happy' : grade === 'B' ? 'calm' : grade === 'C' ? 'neutral' : grade === 'D' ? 'sad' : 'stressed'
    }>{grade}</span>
  );

  return (
    <section className="container">
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2>Weekly Mood Report</h2>
        <div>
          <button onClick={onPrintPDF} aria-label="Print weekly report as PDF">Print / Save as PDF</button>
          <p className="helper-text">Use system dialog to save as PDF.</p>
        </div>
      </header>
      
      <div id="report-print" ref={printRef}>
        <article>
          <header>
            <h2>Weekly Mood Report</h2>
            <p>{data.start} → {data.end}</p>
          </header>

          <div className="grid">
            <article className="contrast">
              <h3>Weekly Grade</h3>
              <p style={{ fontSize: "2rem" }}><GradeBadge /> <strong>{avgHappiness.toFixed(2)}</strong></p>
              <small>Average Happiness Score</small>
            </article>

            <article>
              <h3>Mood Distribution</h3>
              <ul>
                {Object.entries(moodPie).map(([k, v]) => (
                  <li key={k}><span className="m-badge" data-mood={k}>{k}</span> — {(v * 100).toFixed(0)}%</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="grid">
            <article>
              <h3>Positive Triggers</h3>
              <ul>{topPositiveTags.map(t => <li key={t}>✅ {t}</li>)}</ul>
            </article>
            <article>
              <h3>Stress Triggers</h3>
              <ul>{topStressTags.map(t => <li key={t}>⚠️ {t}</li>)}</ul>
            </article>
          </div>

          <article>
            <h3>Weather Effects</h3>
            <p>Temperature: {weatherEffects.temp === 'up' ? '↑ Improves' : weatherEffects.temp === 'down' ? '↓ Worsens' : '— Neutral'}, 
               Humidity: {weatherEffects.humidity === 'up' ? '↑ Improves' : weatherEffects.humidity === 'down' ? '↓ Worsens' : '— Neutral'}</p>
          </article>
        </article>
      </div>
    </section>
  );
}
