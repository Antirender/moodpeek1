import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface Activity {
  activity: string;
  score: number;
  occurrences: number;
}

interface TagBarChartProps {
  positiveActivities: Activity[];
  negativeActivities: Activity[];
  width?: number;
  height?: number;
  className?: string;
}

const TagBarChart: React.FC<TagBarChartProps> = ({
  positiveActivities,
  negativeActivities,
  width = 600,
  height = 400,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if ((!positiveActivities || positiveActivities.length === 0) && 
        (!negativeActivities || negativeActivities.length === 0) || 
        !svgRef.current) return;

    // Early exit if no activities
    if (positiveActivities.length === 0 && negativeActivities.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Use ResizeObserver for responsive sizing
    const resizeObserver = new ResizeObserver(entries => {
      const { width: containerWidth } = entries[0].contentRect;
      updateChart(containerWidth);
    });
    
    const chartContainer = svgRef.current.parentElement;
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }
    
    // Initial render
    updateChart(chartContainer?.clientWidth || width);
    
    // Cleanup
    return () => {
      if (chartContainer) {
        resizeObserver.unobserve(chartContainer);
      }
    };
  }, [positiveActivities, negativeActivities]);
  
  const updateChart = (containerWidth: number) => {
    if (!svgRef.current) return;
    
    // Responsive margin based on available width
    const margin = { 
      top: 30, 
      right: Math.min(30, containerWidth * 0.05), 
      bottom: 60, 
      left: Math.min(100, containerWidth * 0.2) 
    };
    
    // Use container width instead of fixed width
    const innerWidth = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Transform data to common format
    const formattedPositive = positiveActivities.map(item => ({
      tag: item.activity,
      value: item.score,
      occurrences: item.occurrences,
      type: 'positive' as const
    }));
    
    const formattedNegative = negativeActivities.map(item => ({
      tag: item.activity,
      value: item.score,
      occurrences: item.occurrences,
      type: 'negative' as const
    }));
    
    // Combine data for rendering
    const allTags = [
      ...formattedPositive,
      ...formattedNegative
    ];

    // Create scales
    const yScale = d3
      .scaleBand()
      .domain(allTags.map(d => d.tag))
      .range([0, innerHeight])
      .padding(0.2);

    const xScale = d3
      .scaleLinear()
      .domain([
        Math.min(-0.5, d3.min(allTags, (d: any) => d.value) || -0.5),
        Math.max(0.5, d3.max(allTags, (d: any) => d.value) || 0.5)
      ])
      .range([0, innerWidth])
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

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    // Add y-axis
    g.append('g').call(d3.axisLeft(yScale));

    // Add zero line
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add bars
    g.selectAll('.bar')
      .data(allTags)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d: any) => yScale(d.tag) || 0)
      .attr('x', (d: any) => d.value < 0 ? xScale(d.value) : xScale(0))
      .attr('width', (d: any) => Math.abs(xScale(d.value) - xScale(0)))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d: any) => d.value > 0 ? '#4ade80' : '#f87171');

    // Add values
    g.selectAll('.value-label')
      .data(allTags)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('y', (d: any) => (yScale(d.tag) || 0) + yScale.bandwidth() / 2)
      .attr('x', (d: any) => {
        const x = d.value < 0 ? xScale(d.value) - 5 : xScale(d.value) + 5;
        return d.value === 0 ? xScale(0) : x;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.value < 0 ? 'end' : 'start'))
      .attr('font-size', '10px')
      .text((d: any) => d.value.toFixed(2));

    // Add chart title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm font-medium text-gray-700')
      .text('Tag Contribution to Mood');

    // Add x-axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs text-gray-500')
      .text('Mood Score Contribution');

  };

  return (
    <div className={`relative ${className}`}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TagBarChart;