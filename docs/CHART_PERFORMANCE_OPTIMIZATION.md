# Chart Performance Optimization

## Overview

This document describes the chart performance optimization implemented using the LTTB (Largest Triangle Three Buckets) downsampling algorithm.

## Problem

When visualizing large datasets (e.g., 1000+ data points) in charts, the browser can experience performance issues:
- Slow initial render
- Laggy interactions (hover, zoom, pan)
- High memory consumption
- Poor user experience on mobile devices

## Solution

We implemented the **LTTB (Largest Triangle Three Buckets)** algorithm, an advanced downsampling technique that intelligently reduces the number of data points while preserving the visual characteristics and important patterns in the data.

### Why LTTB?

Unlike simple sampling methods (e.g., taking every nth point), LTTB:
- ✅ Preserves peaks and valleys in the data
- ✅ Maintains overall trends and patterns
- ✅ Always keeps the first and last data points
- ✅ Provides consistent visual appearance
- ✅ Significantly reduces rendering overhead

### How it Works

The algorithm works by:
1. Dividing the data into buckets
2. For each bucket, calculating which point forms the largest triangle with:
   - The previously selected point
   - The average of the next bucket
3. This maximizes the visual area covered, preserving significant variations

## Implementation

### Core Module: `src/lib/data-sampling.ts`

The module exports several functions:

#### `downsampleLTTB<T>(data, threshold, xKey?, yKey?)`
The core LTTB implementation that downsamples data to a target number of points.

**Parameters:**
- `data`: Array of data points to sample
- `threshold`: Target number of points after sampling
- `xKey`: (Optional) Key for x-axis values (defaults to 'time' or 'timestamp')
- `yKey`: (Optional) Key for y-axis values (auto-detected)

**Returns:** Downsampled array of data points

#### `adaptiveSample<T>(data, config?, xKey?, yKey?)`
Smart sampling that only applies downsampling when data exceeds a threshold.

**Parameters:**
- `data`: Array of data points
- `config`: Configuration object with:
  - `threshold`: Apply sampling when data exceeds this (default: 500)
  - `targetPoints`: Target number of points after sampling (default: 300)
- `xKey`: (Optional) Key for x-axis values
- `yKey`: (Optional) Key for y-axis values

**Returns:** Original or downsampled array based on threshold

### Usage in BatteryCharts Component

```typescript
import { adaptiveSample } from '@/lib/data-sampling';

// In component:
const sampledReadings = useMemo(() => {
  return adaptiveSample(readings, {
    threshold: 500,    // Apply sampling when more than 500 points
    targetPoints: 300  // Downsample to ~300 points
  }, 'timestamp', 'voltage');
}, [readings]);
```

## Configuration

### Current Settings

- **Threshold**: 500 data points
  - Below 500 points: No sampling applied (data shown as-is)
  - Above 500 points: Sampling applied
  
- **Target Points**: 300 data points
  - Large datasets are downsampled to approximately 300 points
  - This provides excellent visual quality while maintaining performance

### Customization

To adjust the sampling behavior, modify the config in `BatteryCharts.tsx`:

```typescript
const sampledReadings = useMemo(() => {
  return adaptiveSample(readings, {
    threshold: 1000,   // Higher = less aggressive sampling
    targetPoints: 500  // Higher = more detail, lower performance
  }, 'timestamp', 'voltage');
}, [readings]);
```

## Performance Impact

### Before Optimization
- 5000 data points: Slow chart rendering, laggy interactions
- Memory usage: High
- Mobile experience: Poor

### After Optimization
- 5000 data points → 300 sampled points (94% reduction)
- Chart renders: Fast and smooth
- Interactions: Responsive
- Memory usage: Significantly reduced
- Mobile experience: Excellent

## Visual Feedback

When sampling is applied, users see an informative message:
> "Showing 300 of 5000 data points (optimized for performance)"

This transparency helps users understand why they're seeing a subset of their data.

## Testing

Comprehensive tests verify:
- Small datasets remain unchanged
- Large datasets are properly sampled
- First and last points are always preserved
- Target sampling size is achieved
- Algorithm works with different data structures

Run tests: `npx tsx /tmp/test-sampling.ts`

## Algorithm Reference

**LTTB Algorithm** by Sveinn Steinarsson (2013)
- Paper: [Downsampling Time Series for Visual Representation](https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf)
- Widely used in time-series visualization libraries
- Proven effective for real-time monitoring applications

## Future Enhancements

Potential improvements:
- [ ] User-configurable sampling threshold via UI
- [ ] Different sampling strategies based on data characteristics
- [ ] Export full or sampled data in PDF reports
- [ ] A/B comparison view showing original vs. sampled
- [ ] Progressive loading for extremely large datasets

## Related Files

- `/src/lib/data-sampling.ts` - Core sampling algorithm
- `/src/components/BatteryCharts.tsx` - Chart component using sampling
- `/tmp/test-sampling.ts` - Test suite for sampling algorithm
