import fs from "fs";
import path from "path";

export const BRAND_STYLE = {
  colors: {
    background: "pure black (#000000) with subtle diagonal line texture",
    primaryAccent: "neon yellow-green / chartreuse (#C8FF00)",
    secondaryAccent: "electric blue (#3B82F6) for secondary data",
    headingText: "white (#FFFFFF)",
    bodyText: "light gray (#CCCCCC)",
  },
  typography: {
    titleFont:
      "bold condensed sans-serif (Impact/Bebas Neue style) — all caps or mixed case for maximum impact",
    bodyFont: "clean sans-serif (Inter/Helvetica style)",
    bulletStyle: "none — use data visualization instead of bullet lists",
  },
  layout: {
    aspectRatio: "3:4 vertical",
    style: "data-driven infographic with black background and neon accents",
    hierarchy:
      "large bold title → data visualization/chart → source attribution at bottom",
  },
  tone: "bold, data-forward, modern — like a premium analytics dashboard made shareable",
  referenceImagePath: "references/infographic 1.jpeg",
};

export const BRAND_STYLE_PROMPT = `The generated infographic must match this exact visual style:

COLOR PALETTE: Pure black (#000000) background with subtle diagonal line texture for depth. Neon yellow-green / chartreuse (#C8FF00) as the primary accent — used for bar fills, highlighted text, key numbers, and glowing elements. Electric blue (#3B82F6) as a secondary accent for contrast data. White (#FFFFFF) for headings and primary text. Light gray (#CCCCCC) for secondary text and labels.

TYPOGRAPHY: Main title in bold condensed sans-serif (Impact/Bebas Neue style) — large, high-impact, taking up significant space at the top. Can be all caps or mixed case. Key numbers and stats in neon yellow-green, large and prominent. Body text and labels in clean sans-serif (Inter/Helvetica). Source attribution in small light gray at the bottom.

LAYOUT: 3:4 vertical aspect ratio. Large bold title occupying top 15-20% of the image. Central area dominated by data visualization — bar charts, comparison charts, area charts, timelines, or ranked lists. Bottom area has source attribution and optional branding. High contrast, minimal decorative elements.

DATA VISUALIZATION: Use bar charts, stacked comparisons, ranked horizontal bars, timelines, or treemaps. Bars/fills in neon yellow-green (#C8FF00) with subtle glow effect. Grid lines in dark gray (#333333). Labels in white. Numbers prominently displayed alongside or inside chart elements. Use recognizable icons (white, outlined) when referencing brands or concepts.

DESIGN PRINCIPLES: Dark, modern, data-forward aesthetic. High contrast between black background and neon accents. No warm colors, no beige, no muted tones. Content must include specific numbers, real data points, and concrete comparisons — never generic filler. The infographic should look like it belongs on a premium data analytics Twitter account.`;

export const INFOGRAPHIC_STYLES: Record<string, { label: string; description: string }> = {
  "Bar Chart Comparison": {
    label: "Bar Chart Comparison",
    description: `SPECIFIC STYLE — VERTICAL BAR CHART COMPARISON:
Create a vertical bar chart comparison infographic. Two side-by-side vertical bars dominate the center of the image.
- The primary bar should be filled with neon yellow-green (#C8FF00) with a subtle glow/bloom effect around it
- The secondary bar should have a dark fill with white icons/logos stacked inside it
- Large bold numbers displayed prominently ABOVE each bar (e.g., "85.8B" vs "86.9B")
- Thin horizontal grid lines in dark gray across the chart area
- Ranking labels centered below each bar (e.g., "#1", "#2 - #14")
- The bars should take up 50-60% of the vertical space
- Clean, dramatic contrast between the glowing accent bar and the dark secondary bar`,
  },
  "Proportional Blocks": {
    label: "Proportional Blocks",
    description: `SPECIFIC STYLE — PROPORTIONAL STACKED BLOCKS:
Create a proportional area/treemap infographic with stacked rectangular blocks of different sizes.
- The largest block should be neon yellow-green (#C8FF00), taking up ~70-80% of the area, with its percentage displayed large and centered inside
- A medium block in electric blue (#3B82F6), ~10-15% of the area, with its percentage centered inside
- A small block in white (#FFFFFF), ~2-5% of the area, with its percentage centered inside
- All blocks should be stacked vertically, flush against each other
- Dimension annotations on the right side with bracket lines and labels
- The visual should immediately communicate proportion/dominance at a glance
- Clean edges, no rounded corners on the blocks`,
  },
  "Ranked Horizontal Bars": {
    label: "Ranked Horizontal Bars",
    description: `SPECIFIC STYLE — HORIZONTAL BAR CHART (RANKED LIST):
Create a ranked horizontal bar chart infographic listing 10-15 items.
- Each row has: a small icon/symbol on the far left, then the item name, then a horizontal neon yellow-green (#C8FF00) bar extending right, then the percentage/value at the end of the bar
- Bars should be proportional to their values — longest bar at top, shortest at bottom
- Column headers at the top in light gray
- Compact row spacing — maximize the number of items visible
- Clean alignment — all icons, names, bars, and values perfectly aligned in columns
- The overall effect should look like a leaderboard or ranking table
- Thin horizontal separator lines between rows in very dark gray`,
  },
  "Timeline": {
    label: "Timeline",
    description: `SPECIFIC STYLE — TIMELINE / LINE CHART:
Create a vertical timeline infographic showing progression/evolution over time.
- A vertical or diagonal line chart running from bottom-left to top-right
- Data points as dots/circles on the line in neon yellow-green (#C8FF00)
- Each milestone annotated with a quoted statement or event name on the left side
- Year/date and context in neon yellow-green below each quote
- Dollar values or metrics on the right side aligned with each data point
- The line should show growth/progression upward
- Bold contrarian title at top in large white condensed sans-serif (e.g., quotes with quotation marks)
- Legend box in top-left area
- Subtle diagonal line texture on black background`,
  },
  "Pyramid/Funnel": {
    label: "Pyramid/Funnel",
    description: `SPECIFIC STYLE — PYRAMID / FUNNEL DIAGRAM:
Create a pyramid/funnel infographic with 3 layered sections.
- A triangular pyramid shape divided into 3 horizontal tiers
- Top tier (smallest): neon yellow-green (#C8FF00) fill with label inside
- Middle tier: white (#FFFFFF) fill with label inside
- Bottom tier (largest): electric blue (#3B82F6) fill with label inside
- Each tier has bullet points extending to the right side, connected by thin lines with small dots
- Bullet points in white text listing specific items/strategies for each tier
- Large bold title at top in white condensed sans-serif, with key word highlighted in neon yellow-green
- Clean spacing between tiers
- No additional decorative elements — let the pyramid be the hero visual`,
  },
};

export const REFERENCE_IMAGE_PATH = path.join(
  process.cwd(),
  "..",
  "references",
  "infographic 1.jpeg"
);

export async function getBase64ReferenceImage(): Promise<string> {
  const buffer = fs.readFileSync(REFERENCE_IMAGE_PATH);
  const base64 = buffer.toString("base64");
  return base64;
}
