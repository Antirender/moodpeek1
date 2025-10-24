import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Entry } from '../../types';
import { binTemperatureData, binHumidityData } from './utils';
/**
 * AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
 * Reference: https://chatgpt.com/share/68faee5b-180c-800c-9ff2-b877d37f3f51
 * Add/remove/refine more details by myself
 */

interface HeatmapProps {
  data: Entry[];
  type: 'temperature' | 'humidity';
  width?: number;
  height?: number;
  bins?: number;
  className?: string;
}

const Heatmap: React.FC<HeatmapProps> = ({
  data,
  type,
  width = 400,
  height = 300,
  bins = 5,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    range: string;
    value: number;
    count: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    range: '',
    value: 0,
    count: 0,
  });

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Process data based on type
    const binData = type === 'temperature'
      ? binTemperatureData(data, bins)
      : binHumidityData(data, bins);
    
    if (binData.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 30, right: 30, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate cell dimensions
    const cellWidth = innerWidth;
    const cellHeight = innerHeight / binData.length;

    // Create color scale
    const colorScale = d3
      .scaleLinear<string>()
      .domain([-2, 0, 2])
      .range(['#f87171', '#a1a1aa', '#4ade80'])
      .clamp(true);

    // Create SVG group
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add cells
    g.selectAll('.heatmap-cell')
      .data(binData)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('y', (_d: any, i: number) => i * cellHeight)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('fill', (d: any) => colorScale(d.value))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .on('mouseover', (event: MouseEvent, d: any) => {
        const [x, y] = d3.pointer(event);
        setTooltip({
          visible: true,
          x: x + margin.left,
          y: y + margin.top,
          range: d.range,
          value: d.value,
          count: d.count,
        });
      })
      .on('mouseout', () => {
        setTooltip({ ...tooltip, visible: false });
      });

    // Add range labels
    g.selectAll('.range-label')
      .data(binData)
      .enter()
      .append('text')
      .attr('class', 'range-label')
      .attr('x', -10)
      .attr('y', (_d: any, i: number) => i * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .text((d: any) => d.range);

    // Add score labels
    g.selectAll('.score-label')
      .data(binData)
      .enter()
      .append('text')
      .attr('class', 'score-label')
      .attr('x', cellWidth / 2)
      .attr('y', (_d: any, i: number) => i * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', (d: any) => d.value > 1 || d.value < -1 ? 'white' : 'black')
      .text((d: any) => d.count ? d.value.toFixed(1) : 'N/A');

    // Add chart title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm font-medium text-gray-700')
      .text(`Mood by ${type === 'temperature' ? 'Temperature' : 'Humidity'}`);

    // Add count labels
    g.selectAll('.count-label')
      .data(binData)
      .enter()
      .append('text')
      .attr('class', 'count-label')
      .attr('x', cellWidth + 10)
      .attr('y', (_d: any, i: number) => i * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text((d: any) => `n=${d.count}`);

    // Add legend
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = (innerWidth - legendWidth) / 2;
    const legendY = innerHeight + 30;
    
    const legendScale = d3
      .scaleLinear()
      .domain([-2, 2])
      .range([0, legendWidth]);
    
    const legendAxis = d3
      .axisBottom(legendScale)
      .tickValues([-2, -1, 0, 1, 2])
      .tickFormat((d: any) => {
        switch (d) {
          case 2: return 'Happy';
          case 1: return 'Calm';
          case 0: return 'Neutral';
          case -1: return 'Sad';
          case -2: return 'Stressed';
          default: return '';
        }
      });
    
    const defs = svg.append('defs');
    const linearGradient = defs
      .append('linearGradient')
      .attr('id', `${type}-gradient`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    linearGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f87171');
    
    linearGradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#a1a1aa');
    
    linearGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4ade80');
    
    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#${type}-gradient)`);
    
    g.append('g')
      .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('y', 10);

  }, [data, type, width, height, bins, tooltip]);

  return (
    <div className={`relative ${className}`}>
      <svg ref={svgRef}></svg>
      {tooltip.visible && (
        <div
          className="absolute bg-white p-2 rounded shadow-md text-xs pointer-events-none z-10"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div>{tooltip.range}</div>
          <div className="font-semibold">
            Score: {tooltip.value.toFixed(2)} (n={tooltip.count})
          </div>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
