// src/components/charts/LineAvgScore.tsx
import * as d3 from "d3";
import { useEffect, useRef, useMemo } from "react";
import { EntryLite, groupDailyAvg, rollingAvg } from "../../utils/series";
import useContainerSize from "../../hooks/useContainerSize";

// Helper function to clamp values
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Padding constants for consistent spacing
const PAD = {
  axisTitleY: 14,      // y-axis title to tick labels spacing
  axisTitleX: 14,      // x-axis title to tick labels spacing
  legendGap: 16,       // legend to plot area spacing
  legendBarH: 12,      // legend bar height
  legendTextGap: 8     // legend to text spacing
};

export default function LineAvgScore({data, id = "line-avg-score", ...props}: {data: EntryLite[], id?: string, [key: string]: any}) {
  const { ref, width, isSm } = useContainerSize();
  const svgRef = useRef<SVGSVGElement|null>(null);
  
  // Compute responsive dimensions with desktop cap
  const W = Math.max(280, width);
  const H = clamp(Math.round(W * 0.5), 260, 380);
  
  // Improved margins with room for axis labels and titles
  const margin = isSm 
    ? {t: 24, r: 16, b: 64, l: 64}   // Mobile: extra space for labels
    : {t: 28, r: 20, b: 80, l: 80};  // Desktop: extra space for labels
    
  const innerW = W - margin.l - margin.r;
  const innerH = H - margin.t - margin.b;
  
  // Process data with memoization
  const processedData = useMemo(() => {
    const daily = groupDailyAvg(data);
    const smoothed = rollingAvg(daily, 7);
    
    const parse = d3.utcParse("%Y-%m-%d");
    const X = smoothed.map(d => parse(d.day)!);
    const Y = smoothed.map(d => d.value);
    
    return { X, Y };
  }, [data]);
  
  // Create scales with memoization
  const scales = useMemo(() => {
    const { X, Y } = processedData;
    
    const x = d3.scaleUtc()
      .domain(d3.extent(X) as [Date, Date])
      .range([0, innerW]);
      
    const y = d3.scaleLinear()
      .domain([d3.min(Y)! - 0.2, d3.max(Y)! + 0.2])
      .nice()
      .range([innerH, 0]);
      
    const line = d3.line<Date>()
      .x((d, i) => x(X[i])!)
      .y((d, i) => y(Y[i])!)
      .curve(d3.curveMonotoneX);
      
    return { x, y, line };
  }, [processedData, innerW, innerH]);
  
  useEffect(() => {
    if (!svgRef.current || !width) return;

    const { X, Y } = processedData;
    const { x, y, line } = scales;
    
    // Base margins before dynamic adjustment
    const baseMargin = isSm 
      ? {t: 24, r: 16, b: 48, l: 48}
      : {t: 28, r: 20, b: 56, l: 56};
    
    // Set up SVG with viewBox for responsiveness
    const svg = d3.select(svgRef.current);
    
    // Clear all previous content
    svg.selectAll("*").remove();
    
    // Set up defs with clip path for plot area only
    const defs = svg.append('defs');
    defs.append('clipPath')
      .attr('id', `plotClip-${id}`)
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);
    
    // Create root group for everything - initially positioned with base margin
    const root = svg.append('g')
      .attr('class', 'root')
      .attr('transform', `translate(${baseMargin.l},${baseMargin.t})`);
      
    // Create grid group (behind plot)
    const grid = root.append('g')
      .attr('class', 'grid');
      
    // Add grid lines
    grid.selectAll('line')
      .data(y.ticks(isSm ? 4 : 6))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', 'var(--pico-muted-border-color)')
      .attr('opacity', 0.2);
      
    // Create plot group for line (with clipping)
    const plot = root.append('g')
      .attr('class', 'plot')
      .attr('clip-path', `url(#plotClip-${id})`);
      
    // Create axis groups (without clipping)
    const axisX = root.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${innerH})`);
      
    const axisY = root.append('g')
      .attr('class', 'axis axis-y');

    // Draw line in plot group
    plot.append("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "var(--pico-primary)")
      .attr("stroke-width", isSm ? 1.5 : 2)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("shape-rendering", "geometricPrecision")
      .attr("d", line(X));

    // X-axis with responsive ticks
    axisX.call(d3.axisBottom(x).ticks(isSm ? 4 : 8).tickSizeOuter(0));
    
    axisX.selectAll("text")
      .style("font-size", isSm ? "11px" : "12px")
      .attr("dy", "0.9em")
      .attr("fill", "currentColor");
      
    // Y-axis
    axisY.call(d3.axisLeft(y).ticks(isSm ? 4 : 6).tickSizeOuter(0));
    
    axisY.selectAll("text")
      .style("font-size", isSm ? "11px" : "12px")
      .attr("dx", "-0.35em")
      .attr("fill", "currentColor");
    
    // DYNAMIC MARGIN CALCULATION
    const yTickNodes = axisY.selectAll('.tick text').nodes() as SVGTextElement[];
    const maxYTickW = yTickNodes.length > 0 
      ? Math.max(...yTickNodes.map((n: SVGTextElement) => n.getBBox().width))
      : 30;
    
    const xTickNodes = axisX.selectAll('.tick text').nodes() as SVGTextElement[];
    const maxXTickH = xTickNodes.length > 0
      ? Math.max(...xTickNodes.map((n: SVGTextElement) => n.getBBox().height))
      : 16;
    
    const titleGapY = 12;
    const titleGapX = 10;
    
    const adjustedMarginL = Math.max(baseMargin.l, 44 + maxYTickW + titleGapY);
    const adjustedMarginB = Math.max(baseMargin.b, 40 + maxXTickH + titleGapX);
    
    // Reposition root group with adjusted margins
    root.attr('transform', `translate(${adjustedMarginL},${baseMargin.t})`);
      
    // Add Y-axis label (positioned based on measured tick width with extra spacing)
    axisY.append("text")
      .attr("class", "axis-title y-title")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-(maxYTickW + titleGapY + 8)}, ${innerH / 2}) rotate(-90)`)
      .attr("fill", "currentColor")
      .style("font-size", isSm ? "12px" : "13px")
      .style("font-weight", "600")
      .text("Average Happiness");
      
    // Add X-axis label (positioned based on measured tick height)
    axisX.append("text")
      .attr("class", "axis-title x-title")
      .attr("x", innerW / 2)
      .attr("y", maxXTickH + titleGapX + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .style("font-size", isSm ? "12px" : "13px")
      .style("font-weight", "600")
      .text("Date");
      
    // Style axis lines
    root.selectAll(".axis path, .axis line")
      .attr("stroke", "var(--pico-muted-border-color)")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);
    
    // Update SVG viewBox with adjusted dimensions
    const finalW = innerW + adjustedMarginL + baseMargin.r;
    const finalH = innerH + baseMargin.t + adjustedMarginB;
    svg.attr('viewBox', `0 0 ${finalW} ${finalH}`)
      .attr('role', 'img')
      .attr('preserveAspectRatio', 'xMidYMid meet');
      
  }, [processedData, scales, width, innerW, innerH, isSm, id]);

  return (
    <div ref={ref} style={{ width: '100%' }} className="chart-card">
      <svg 
        ref={svgRef}
        className="chart"
        aria-label="Line chart showing average mood score over time with 7-day rolling average"
        {...props}
      />
    </div>
  );
}