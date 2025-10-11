// src/components/charts/TagContribBar.tsx
import * as d3 from "d3";
import { useEffect, useRef, useMemo } from "react";
import { computeTagContrib } from "../../utils/tags";
import useContainerSize from "../../hooks/useContainerSize";

type Entry = { tags?: string[]; mood: 'happy'|'calm'|'neutral'|'sad'|'stressed' };

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

export default function TagContribBar({data, id = "tag-contrib-bar", ...props}: {data: Entry[], id?: string, [key: string]: any}) {
  const { ref, width, isSm } = useContainerSize();
  const svgRef = useRef<SVGSVGElement|null>(null);
  
  // Compute responsive dimensions with desktop cap
  const W = Math.max(280, width);
  
  // Determine orientation: horizontal for mobile, vertical for desktop
  const horizontal = isSm;
  
  // Clamp bar thickness
  const bar = clamp(W * 0.06, 22, 40);
  const gap = clamp(W * 0.02, 8, 16);
  
  // Process data with memoization
  const processedData = useMemo(() => {
    const { rowsAll } = computeTagContrib(data, 2, isSm ? 4 : 5);
    return { rowsAll };
  }, [data, isSm]);
  
  const { rowsAll } = processedData;
  
  // Calculate height based on orientation
  const H = horizontal
    ? clamp(rowsAll.length * (bar + gap) + 160, 260, 380) // Extra space for labels
    : clamp(Math.round(W * 0.45), 260, 360);
  
  // Margins with room for axis labels and titles
  const margin = isSm 
    ? {t: 24, r: 16, b: 64, l: 92}    // Mobile: extra space for labels
    : {t: 28, r: 20, b: 80, l: 110};  // Desktop: extra space for labels
    
  const innerW = W - margin.l - margin.r;
  const innerH = H - margin.t - margin.b;
  
  // Remove old scales memoization - we'll create scales in useEffect
  
  useEffect(() => {
    if (!svgRef.current || !width || rowsAll.length === 0) return;
    
    // Base margins before dynamic adjustment
    const baseMargin = isSm 
      ? {t: 24, r: 16, b: 56, l: 56}
      : {t: 28, r: 20, b: 64, l: 64};
    
    // Set up SVG with viewBox for responsiveness
    const svg = d3.select(svgRef.current);
    
    // Clear all previous content
    svg.selectAll("*").remove();
    
    // If no data, show message
    if (rowsAll.length === 0) {
      svg.append("text")
        .attr("x", W / 2)
        .attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--pico-muted-color)")
        .text("No tag data yet.");
      return;
    }
    
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
      
    // Create plot group for bars (with clipping)
    const plot = root.append('g')
      .attr('class', 'plot')
      .attr('clip-path', `url(#plotClip-${id})`);
      
    // Create axis groups (without clipping)
    const axisX = root.append('g')
      .attr('class', 'axis axis-x');
      
    const axisY = root.append('g')
      .attr('class', 'axis axis-y');
    
    const maxAbs = d3.max(rowsAll, d => Math.abs(d.value)) ?? 1;
    const canLabel = innerW > 420; // Only show value labels if there's enough space
    
    if (horizontal) {
      // ========== HORIZONTAL BAR LAYOUT (MOBILE) ==========
      
      // Create scales for horizontal layout
      const yBand = d3.scaleBand<string>()
        .domain(rowsAll.map(r => r.tag))
        .range([0, innerH])
        .paddingInner(0.2)
        .paddingOuter(0.1);
      
      const xLinear = d3.scaleLinear()
        .domain([-maxAbs, maxAbs])
        .range([0, innerW])
        .nice();
        
      // Center line
      plot.append("line")
        .attr("class", "center-line")
        .attr("x1", xLinear(0))
        .attr("x2", xLinear(0))
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("stroke", "var(--pico-muted-border-color)")
        .attr("stroke-opacity", 0.25);
        
      // Position axes
      axisX.attr('transform', `translate(0,${innerH})`);
      
      // Draw axes
      axisX.call(d3.axisBottom(xLinear).ticks(isSm ? 3 : 5).tickSizeOuter(0));
      axisY.call(d3.axisLeft(yBand).tickSizeOuter(0));
      
      // Style axis text
      axisX.selectAll("text")
        .style("font-size", "11px")
        .attr("dy", "0.9em")
        .attr("fill", "currentColor");
        
      axisY.selectAll("text")
        .style("font-size", "11px")
        .attr("dx", "-0.35em")
        .attr("fill", "currentColor");
      
      // DYNAMIC MARGIN CALCULATION FOR HORIZONTAL
      const yTickNodes = axisY.selectAll('.tick text').nodes() as SVGTextElement[];
      const maxYTickW = yTickNodes.length > 0 
        ? Math.max(...yTickNodes.map((n: SVGTextElement) => n.getBBox().width))
        : 40;
      
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
      
      // Add X-axis label
      axisX.append("text")
        .attr("class", "axis-title x-title")
        .attr("x", innerW / 2)
        .attr("y", maxXTickH + titleGapX + 12)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text("Contribution");
        
      // Add Y-axis label (with extra spacing to avoid tick number overlap)
      axisY.append("text")
        .attr("class", "axis-title y-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${-(maxYTickW + titleGapY + 8)}, ${innerH / 2}) rotate(-90)`)
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text("Tag");
        
      // Draw horizontal bars
      const barHeight = Math.min(yBand.bandwidth(), bar);
      const barOffset = (yBand.bandwidth() - barHeight) / 2;
      
      plot.selectAll("rect.bar")
        .data(rowsAll)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => Math.min(xLinear(0), xLinear(d.value)))
        .attr("y", d => yBand(d.tag)! + barOffset)
        .attr("width", d => Math.abs(xLinear(d.value) - xLinear(0)))
        .attr("height", barHeight)
        .attr("rx", 3)
        .attr("fill", d => d.value >= 0 ? "var(--mood-happy, #7fb800)" : "var(--mood-stressed, #c13525)")
        .append("title")
        .text(d => `${d.tag}: ${d.value.toFixed(2)}`);
        
      // Value labels (only on larger bars)
      if (canLabel) {
        plot.selectAll("text.value")
          .data(rowsAll.filter(d => Math.abs(d.value) > maxAbs * 0.15))
          .join("text")
          .attr("class", "value")
          .attr("x", d => d.value >= 0 ? xLinear(d.value) - 4 : xLinear(d.value) + 4)
          .attr("y", d => (yBand(d.tag)! + yBand.bandwidth() / 2) + 3)
          .attr("text-anchor", d => d.value >= 0 ? "end" : "start")
          .attr("fill", "var(--pico-contrast)")
          .style("font-size", "10px")
          .style("font-weight", "500")
          .text(d => d.value.toFixed(2));
      }
      
      // Update SVG viewBox with adjusted dimensions
      const finalW = innerW + adjustedMarginL + baseMargin.r;
      const finalH = innerH + baseMargin.t + adjustedMarginB;
      svg.attr('viewBox', `0 0 ${finalW} ${finalH}`)
        .attr('role', 'img')
        .attr('preserveAspectRatio', 'xMidYMid meet');
        
    } else {
      // ========== VERTICAL BAR LAYOUT (DESKTOP) ==========
      
      // Create scales for vertical layout
      const xBand = d3.scaleBand<string>()
        .domain(rowsAll.map(r => r.tag))
        .range([0, innerW])
        .paddingInner(0.2)
        .paddingOuter(0.1);
      
      const yLinear = d3.scaleLinear()
        .domain([-maxAbs, maxAbs])
        .range([innerH, 0])
        .nice();
        
      // Center line
      plot.append("line")
        .attr("class", "center-line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", yLinear(0))
        .attr("y2", yLinear(0))
        .attr("stroke", "var(--pico-muted-border-color)")
        .attr("stroke-opacity", 0.25);
        
      // Position axes
      axisX.attr('transform', `translate(0,${yLinear(0)})`);
      
      // Draw axes
      axisX.call(d3.axisBottom(xBand).tickSizeOuter(0));
      axisY.call(d3.axisLeft(yLinear).ticks(isSm ? 3 : 6).tickFormat(d3.format(".2f")).tickSizeOuter(0));
      
      // Style axis text
      axisX.selectAll("text")
        .style("font-size", "12px")
        .attr("transform", "rotate(-15)")
        .style("text-anchor", "end")
        .attr("dy", "0.9em")
        .attr("fill", "currentColor");
        
      axisY.selectAll("text")
        .style("font-size", "12px")
        .attr("dx", "-0.35em")
        .attr("fill", "currentColor");
      
      // DYNAMIC MARGIN CALCULATION FOR VERTICAL
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
      const adjustedMarginB = Math.max(baseMargin.b, yLinear(0) + maxXTickH + titleGapX + 12);
      
      // Reposition root group with adjusted margins
      root.attr('transform', `translate(${adjustedMarginL},${baseMargin.t})`);
      
      // Add X-axis label (positioned below the rotated tick labels)
      const xLabelY = innerH - yLinear(0) + maxXTickH + titleGapX + 12;
      axisX.append("text")
        .attr("class", "axis-title x-title")
        .attr("x", innerW / 2)
        .attr("y", xLabelY)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Tag");
        
      // Add Y-axis label (with extra spacing to avoid tick number overlap)
      axisY.append("text")
        .attr("class", "axis-title y-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${-(maxYTickW + titleGapY + 8)}, ${innerH / 2}) rotate(-90)`)
        .attr("fill", "currentColor")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Contribution");
        
      // Draw vertical bars
      const barWidth = Math.min(xBand.bandwidth(), bar);
      const barOffset = (xBand.bandwidth() - barWidth) / 2;
      
      plot.selectAll("rect.bar")
        .data(rowsAll)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => xBand(d.tag)! + barOffset)
        .attr("y", d => d.value >= 0 ? yLinear(d.value) : yLinear(0))
        .attr("width", barWidth)
        .attr("height", d => Math.abs(yLinear(d.value) - yLinear(0)))
        .attr("rx", 4)
        .attr("fill", d => d.value >= 0 ? "var(--mood-happy, #7fb800)" : "var(--mood-stressed, #c13525)")
        .append("title")
        .text(d => `${d.tag}: ${d.value.toFixed(2)}`);
        
      // Value labels (only on larger bars)
      if (canLabel) {
        plot.selectAll("text.value")
          .data(rowsAll.filter(d => Math.abs(d.value) > maxAbs * 0.1))
          .join("text")
          .attr("class", "value")
          .attr("x", d => xBand(d.tag)! + xBand.bandwidth() / 2)
          .attr("y", d => d.value >= 0 ? yLinear(d.value) - 6 : yLinear(d.value) + 16)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--pico-contrast)")
          .style("font-size", "11px")
          .style("font-weight", "500")
          .text(d => d.value.toFixed(2));
      }
      
      // Update SVG viewBox with adjusted dimensions
      const finalW = innerW + adjustedMarginL + baseMargin.r;
      const finalH = innerH + baseMargin.t + adjustedMarginB;
      svg.attr('viewBox', `0 0 ${finalW} ${finalH}`)
        .attr('role', 'img')
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }
    
    // Style axis lines (common for both layouts)
    root.selectAll(".axis path, .axis line")
      .attr("stroke", "var(--pico-muted-border-color)")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);
    
  }, [rowsAll, width, innerW, innerH, isSm, horizontal, bar, id]);
  
  return (
    <div ref={ref} style={{ width: '100%' }} className="chart-card">
      <svg 
        ref={svgRef}
        className="chart"
        aria-label="Bar chart showing how different tags affect mood scores"
        {...props}
      />
    </div>
  );
}