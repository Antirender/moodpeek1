import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Entry } from '../../types';
import { calculateRollingAverage, formatDate } from './utils';

interface LineChartProps {
  data: Entry[];
  width?: number;
  height?: number;
  showRollingAverage?: boolean;
  rollingWindow?: number;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 600,
  height = 300,
  showRollingAverage = false,
  rollingWindow = 7,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    value: number;
  }>({ visible: false, x: 0, y: 0, date: '', value: 0 });

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    // Sort data by date
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Convert mood to numeric score
    const dataPoints = sortedData.map((entry) => ({
      date: new Date(entry.date),
      value: moodToScore(entry.mood),
      mood: entry.mood,
    }));

    // Calculate rolling average if needed
    const rollingData = showRollingAverage
      ? calculateRollingAverage(sortedData, rollingWindow)
      : [];

    // Use ResizeObserver for responsive sizing
    const resizeObserver = new ResizeObserver(entries => {
      const { width: containerWidth } = entries[0].contentRect;
      updateChart(containerWidth, dataPoints, rollingData);
    });
    
    const chartContainer = svgRef.current.parentElement;
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }
    
    // Initial render
    updateChart(chartContainer?.clientWidth || width, dataPoints, rollingData);
    
    // Cleanup
    return () => {
      if (chartContainer) {
        resizeObserver.unobserve(chartContainer);
      }
    };
  }, [data, showRollingAverage, rollingWindow]);
  
  const updateChart = (containerWidth: number, dataPoints: any[], rollingData: any[]) => {
    if (!svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Responsive margins based on screen size
    const margin = { 
      top: 20, 
      right: Math.min(30, containerWidth * 0.05), 
      bottom: 40, 
      left: Math.min(40, containerWidth * 0.1)
    };
    const innerWidth = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataPoints, (d: any) => d.date) as [Date, Date])
      .range([0, innerWidth])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([-2.5, 2.5]) // Fixed domain for mood scores
      .range([innerHeight, 0])
      .nice();

    // Create SVG group with responsive dimensions
    const svg = d3
      .select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat((d: any) => formatDate(d as Date))
      )
      .selectAll('text')
      .attr('y', 10)
      .attr('x', 0)
      .attr('text-anchor', 'middle');

    g.append('g')
      .call(
        d3.axisLeft(yScale).tickFormat((d: any) => {
          switch (d) {
            case 2: return 'Happy';
            case 1: return 'Calm';
            case 0: return 'Neutral';
            case -1: return 'Sad';
            case -2: return 'Stressed';
            default: return '';
          }
        })
      );

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([-2, -1, 0, 1, 2])
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '5,5');

    // Add data points
    g.selectAll('circle')
      .data(dataPoints)
      .enter()
      .append('circle')
      .attr('cx', (d: any) => xScale(d.date))
      .attr('cy', (d: any) => yScale(d.value))
      .attr('r', 5)
      .attr('fill', (d: any) => getMoodColor(d.mood as any))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', (_event: any, d: any) => {
        setTooltip({
          visible: true,
          x: xScale(d.date) + margin.left,
          y: yScale(d.value) + margin.top - 10,
          date: formatDate(d.date),
          value: d.value,
        });
      })
      .on('mouseout', () => {
        setTooltip({ ...tooltip, visible: false });
      });

    // Add rolling average line if requested
    if (showRollingAverage && rollingData.length > 0) {
      const line = d3
        .line<{ date: Date; value: number }>()
        .x((d: any) => xScale(d.date))
        .y((d: any) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(rollingData)
        .attr('fill', 'none')
        .attr('stroke', '#60a5fa')
        .attr('stroke-width', 2)
        .attr('d', line);
    }

    // Add chart title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm font-medium text-gray-700')
      .text(
        showRollingAverage
          ? `Mood Over Time (${rollingWindow}-day Rolling Average)`
          : 'Mood Over Time'
      );

    // Add y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -30)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs text-gray-500')
      .text('Mood Score');

    // Add x-axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs text-gray-500')
      .text('Date');

  };

  // Helper function to convert mood to numeric score
  const moodToScore = (mood: string): number => {
    switch (mood) {
      case 'happy': return 2;
      case 'calm': return 1;
      case 'neutral': return 0;
      case 'sad': return -1;
      case 'stressed': return -2;
      default: return 0;
    }
  };

  // Helper function to get mood color
  const getMoodColor = (mood: string): string => {
    switch (mood) {
      case 'happy': return '#4ade80'; // green-400
      case 'calm': return '#60a5fa'; // blue-400
      case 'neutral': return '#a1a1aa'; // zinc-400
      case 'sad': return '#94a3b8'; // slate-400
      case 'stressed': return '#f87171'; // red-400
      default: return '#a1a1aa'; // default gray
    }
  };

  return (
    <div className={`relative ${className}`}>
      <svg ref={svgRef}></svg>
      {tooltip.visible && (
        <div
          className="absolute bg-white p-2 rounded shadow-md text-xs pointer-events-none z-10 transform -translate-x-1/2"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div>{tooltip.date}</div>
          <div className="font-semibold">
            {tooltip.value === 2
              ? 'Happy'
              : tooltip.value === 1
              ? 'Calm'
              : tooltip.value === 0
              ? 'Neutral'
              : tooltip.value === -1
              ? 'Sad'
              : 'Stressed'}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChart;