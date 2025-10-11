// src/components/charts/HeatmapTempMood.tsx
import * as d3 from "d3";
import { useEffect, useRef, useMemo } from "react";
import { moods, tempMoodMatrix } from "../../utils/bins";
import { Mood } from "../../types";
import useContainerSize from "../../hooks/useContainerSize";

type EntryLite = { weather: { tempC: number }; mood: Mood };

// Emoji mappings for small screens
const moodEmoji: Record<Mood, string> = {
  happy: "🙂",
  calm: "😌",
  neutral: "😐",
  sad: "😔",
  stressed: "😖"
};

// Helper function to clamp values
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Padding constants for consistent spacing
const PAD = {
  axisTitleY: 18,      // y-axis title to tick labels spacing
  axisTitleX: 18,      // x-axis main label/legend to color bar spacing
  legendGap: 32,       // plot area to bottom legend vertical spacing (increased from 20)
  legendBarH: 12,      // color bar height
  legendTextGap: 10    // color bar to text spacing
};

export default function HeatmapTempMood({ data, id = "heatmap-temp-mood", ...props }: { data: EntryLite[], id?: string, [key: string]: any }) {
  const { ref, width, isSm } = useContainerSize();
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  // Compute chart dimensions based on container width
  const W = Math.max(280, width);
  
  // Calculate row heights based on container width
  const rowH = clamp(W * 0.06, 28, 44);
  const rowGap = clamp(W * 0.02, 10, 18);
  const rowsTotal = moods.length * rowH + (moods.length - 1) * rowGap;
  
  // Margins with extra room for axis labels and legend
  const margin = isSm
    ? { t: 32, r: 20, b: 110, l: 140 }
    : { t: 40, r: 28, b: 120, l: 156 };
  
  // Inner dimensions (plotting area)
  const innerW = W - margin.l - margin.r;
  const innerH = rowsTotal;
  
  // Total height including legend space
  const H = Math.max(
    innerH + margin.t + margin.b + PAD.legendGap + PAD.legendBarH + PAD.legendTextGap + PAD.axisTitleX,
    isSm ? 300 : 360
  );

  // Memoize data processing
  const cells = useMemo(() => tempMoodMatrix(data), [data]);
  
  // Get temperature bins from data or use fallbacks
  const xBins = useMemo(() => {
    const bins = [...new Set(cells.map(c => c.x))];
    return bins.length > 0 ? bins : ["10-15", "15-20", "20-25", "25-30"];
  }, [cells]);
  
  const yBins = moods;
  
  // Create scales with memoization
  const scales = useMemo(() => {
    const x = d3.scaleBand()
      .domain(xBins)
      .range([0, innerW])
      .paddingInner(0.2) // Ensure padding to avoid clipping
      .paddingOuter(0.1);
    
    const y = d3.scaleBand()
      .domain(yBins)
      .range([0, innerH])
      .paddingInner(0.2)
      .paddingOuter(0.1);
      
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, 1]);
    
    return { x, y, color };
  }, [innerW, innerH, xBins, yBins]);
  
  useEffect(() => {
    if (!svgRef.current || !width) return;
    
    const { x, y, color } = scales;
    
    // Base margins before dynamic adjustment
    const baseMargin = isSm
      ? { t: 32, r: 20, b: 110, l: 48 }
      : { t: 40, r: 28, b: 120, l: 64 };
    
    // Set up SVG with viewBox for responsiveness
    const svg = d3.select(svgRef.current);
      
    // Clear all previous content
    svg.selectAll("*").remove();
    
    // Set up defs with clip path
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
      
    // Create plot group for heatmap cells (with clipping)
    const plot = root.append('g')
      .attr('class', 'plot')
      .attr('clip-path', `url(#plotClip-${id})`);
      
    // Create axis groups (without clipping)
    const axisX = root.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${innerH})`);
      
    const axisY = root.append('g')
      .attr('class', 'axis axis-y');
      
    // Create legend group (positioned below plot area with spacing)
    const legendG = root.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0,${innerH + PAD.legendGap})`);
    
    // Draw heatmap cells in plot group
    plot.selectAll("rect.cell")
      .data(cells)
      .join("rect")
      .attr("class", "cell")
      .attr("x", (d: { x: string, y: Mood, value: number }) => x(d.x)!)
      .attr("y", (d: { x: string, y: Mood, value: number }) => y(d.y)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", (d: { x: string, y: Mood, value: number }) => color(d.value))
      .append("title")
      .text((d: { x: string, y: Mood, value: number }) => 
        `${d.x} × ${d.y}: ${(d.value * 100).toFixed(0)}%`);
    
    // X-axis with conditional rotation and improved formatting
    axisX.call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickFormat((d: any) => `${d}°`));
    
    // Make x-axis labels more visible
    axisX.selectAll("text")
      .style("font-size", isSm ? "11px" : "12px")
      .attr("transform", isSm ? null : "rotate(-15)")
      .style("text-anchor", isSm ? "middle" : "end")
      .attr("dy", "0.8em")
      .attr("fill", "currentColor")
      .style("font-weight", "500");
      
    // Y-axis with emoji on small screens
    axisY.call(d3.axisLeft(y)
      .tickSizeOuter(0)
      .tickFormat((d: any) => {
        return isSm 
          ? `${moodEmoji[d as Mood]} ${d}`
          : d;
      }));
    
    // Make y-axis labels more visible and add spacing
    axisY.selectAll("text")
      .style("font-size", isSm ? "11px" : "12px")
      .attr("dx", "-0.35em")
      .attr("fill", "currentColor")
      .style("font-weight", "500");
      
    // DYNAMIC MARGIN CALCULATION - Measure Y-axis tick widths
    const yTickNodes = axisY.selectAll('.tick text').nodes() as SVGTextElement[];
    const maxYTickW = yTickNodes.length > 0 
      ? Math.max(...yTickNodes.map((n: SVGTextElement) => n.getBBox().width))
      : 40;
    
    const titleGapY = 16;
    const extraLeft = maxYTickW + titleGapY + 12;
    const adjustedMarginL = Math.max(baseMargin.l, baseMargin.l + extraLeft);
    
    // Reposition root group with adjusted margin
    root.attr('transform', `translate(${adjustedMarginL},${baseMargin.t})`);
      
    // Style axis lines - make more visible
    root.selectAll(".axis path, .axis line")
      .attr("stroke", "var(--pico-muted-border-color)")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.8);
      
    // Add Y-axis label (positioned based on measured tick width)
    axisY.append("text")
      .attr("class", "axis-title y-title")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-(maxYTickW + titleGapY)}, ${innerH / 2}) rotate(-90)`)
      .attr("fill", "currentColor")
      .style("font-size", isSm ? "12px" : "14px")
      .style("font-weight", "700")
      .text("Mood");
      
    // Create gradient for legend
    const gradientId = `heatmap-gradient-${id}`;
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");
      
    // Add gradient stops
    const stops = [0, 0.2, 0.4, 0.6, 0.8, 1];
    stops.forEach(stop => {
      gradient.append("stop")
        .attr("offset", `${stop * 100}%`)
        .attr("stop-color", color(stop));
    });
    
    const legendGap = 12;
    const titleGapX = 18;
    
    // Draw legend rectangle (color bar)
    const legendBar = legendG.append("rect")
      .attr("class", "gradient")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", PAD.legendBarH)
      .attr("rx", 4)
      .attr("fill", `url(#${gradientId})`);
      
    // Upper label: Frequency (above color bar)
    legendG.append("text")
      .attr("class", "freq")
      .attr("x", innerW / 2)
      .attr("y", -legendGap)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .style("font-size", isSm ? "11px" : "12px")
      .style("font-weight", "500")
      .text("Frequency (low → high)");
      
    // Lower label: Temperature (below color bar)
    legendG.append("text")
      .attr("class", "temp")
      .attr("x", innerW / 2)
      .attr("y", PAD.legendBarH + titleGapX)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .style("font-size", isSm ? "12px" : "13px")
      .style("font-weight", "600")
      .text("Temperature (°C)");
    
    // Update SVG viewBox with adjusted dimensions
    const finalW = innerW + adjustedMarginL + baseMargin.r;
    const finalH = innerH + baseMargin.t + baseMargin.b + PAD.legendGap + PAD.legendBarH + titleGapX + 20;
    svg.attr('viewBox', `0 0 ${finalW} ${Math.max(finalH, isSm ? 300 : 360)}`)
      .attr('role', 'img')
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
  }, [data, width, scales, innerW, innerH, isSm, cells, id]);
  
  return (
    <div ref={ref} style={{ width: '100%' }} className="chart-card">
      <svg 
        ref={svgRef}
        className="chart"
        aria-label="Temperature by mood heatmap showing correlation between temperature and emotional state"
        {...props}
      />
    </div>
  );
}