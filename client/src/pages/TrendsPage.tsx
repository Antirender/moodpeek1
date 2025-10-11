import React from 'react';
import useSWR from "swr";
import { fetchJSON } from "../lib/http";
import HeatmapTempMood from "../components/charts/HeatmapTempMood";
import LineAvgScore from "../components/charts/LineAvgScore";
import TagContribBar from "../components/charts/TagContribBar";
import ChartHelp from "../components/charts/ChartHelp";
import "../styles/charts.css";

export default function TrendsPage() {
  const { data, isLoading, error } = useSWR<any[]>("/api/entries", fetchJSON);
  
  if (error) return <article className="contrast"><p>read/fetch error</p></article>;
  if (isLoading || !data) return <progress />;
  
  return (
    <main>
      <div className="trends-container">
        <header>
          <h2>Mood Trends</h2>
          <p style={{ color: 'var(--pico-muted-color)' }}>
            Visualize patterns in your mood data over time, by temperature, and by activity tags.
          </p>
        </header>
        
        <ChartHelp defaultOpen={false} />
        
        <section className="trends-grid">
          <div className="chart-card">
            <h3 className="chart-title">Temperature × Mood Heatmap</h3>
            <HeatmapTempMood data={data} aria-label="Temperature by mood heatmap" />
          </div>
          
          <div className="chart-card">
            <h3 className="chart-title">Mood Over Time</h3>
            <LineAvgScore data={data} aria-label="Mood over time line chart" />
          </div>
          
          <div className="chart-card">
            <h3 className="chart-title">Tag Analysis</h3>
            <TagContribBar data={data} aria-label="Tag contribution bar chart" />
          </div>
        </section>
      </div>
    </main>
  );
}