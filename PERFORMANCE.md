# Chart Performance Optimization

## Overview

This document describes the performance optimizations implemented for the `BatteryCharts` component to handle large datasets efficiently.

## Problem

The original implementation rendered all data points directly to the chart, which caused performance issues with large datasets:
- Slow rendering with thousands of data points
- Laggy interactions (tooltips, zooming)
- High memory usage
- Poor user experience with large CSV uploads

## Solution

We implemented intelligent data sampling using the **Largest-Triangle-Three-Buckets (LTTB)** algorithm combined with React optimization techniques.

### Key Features

1. **Intelligent Data Sampling**
   - Reduces large datasets to a maximum of 500 points
   - Preserves visual fidelity and important trends
   - Always keeps first and last data points
   - Uses LTTB algorithm to select the most representative points

2. **Conditional Rendering**
   - Dots are only shown for datasets with ≤100 points
   - Improves rendering performance for large datasets
   - Maintains visual clarity for smaller datasets

3. **React Optimizations**
   - Uses `useMemo` to prevent unnecessary recalculations
   - Disables chart animations for better performance
   - Memoizes expensive operations (data transformation, sampling)

## Performance Improvements

### Data Reduction

| Original Size | Sampled Size | Reduction |
|--------------|--------------|-----------|
| 50 points    | 50 points    | 0%        |
| 500 points   | 500 points   | 0%        |
| 2,000 points | 500 points   | 75%       |
| 10,000 points| 500 points   | 95%       |

### Expected Performance Gains

- **Rendering Time**: 75-95% reduction for large datasets
- **Memory Usage**: Proportional reduction based on sampling ratio
- **Interaction Latency**: Significantly reduced for tooltips and zoom operations

## Implementation Details

### Data Sampling Module (`src/lib/data-sampling.ts`)

```typescript
export function sampleData(data: BatteryReading[], threshold: number = 500): BatteryReading[]
```

- Implements the LTTB algorithm
- Configurable threshold (default: 500 points)
- Preserves temporal order and key data points
- Returns original data if size ≤ threshold

```typescript
export function shouldShowDots(dataLength: number): boolean
```

- Returns `true` for datasets with ≤100 points
- Returns `false` for larger datasets to improve performance

### BatteryCharts Component Updates

1. **Data Processing Pipeline**:
   ```
   Raw Data → Sample (LTTB) → Transform (memoized) → Chart
   ```

2. **Optimizations**:
   - `useMemo` for sampling operation
   - `useMemo` for data transformation
   - `useMemo` for dot visibility calculation
   - Disabled chart animations (`isAnimationActive={false}`)

## Algorithm: Largest-Triangle-Three-Buckets (LTTB)

LTTB is a downsampling algorithm that preserves the visual characteristics of time-series data:

1. **Divide data into buckets**: Data is divided into N buckets where N = desired output size
2. **Select representative points**: For each bucket, select the point that forms the largest triangle with neighboring bucket averages
3. **Preserve endpoints**: Always keep the first and last points

This algorithm is particularly effective for time-series data as it:
- Preserves peaks and valleys
- Maintains overall trends
- Provides consistent visual output
- Performs better than simple averaging or decimation

## Testing

Run the sampling algorithm test:

```bash
node /tmp/test-inline.js
```

Expected output:
```
Small dataset (50 points):
  Sampled to: 50 points (0.0% reduction)
  
Large dataset (2000 points):
  Sampled to: 500 points (75.0% reduction)
  
Very large dataset (10000 points):
  Sampled to: 500 points (95.0% reduction)
```

## Usage

The optimization is automatic and transparent to users:

1. Upload any size CSV file
2. Data is automatically sampled if needed
3. Charts render quickly with maintained visual fidelity
4. All original data is preserved (only display is sampled)

## Future Enhancements

Potential improvements for even better performance:

1. **Virtual Scrolling**: For extremely large datasets (100k+ points)
2. **WebGL Rendering**: For real-time data streaming
3. **Progressive Loading**: Load and render data in chunks
4. **Worker Threads**: Offload sampling computation to web workers
5. **Adaptive Sampling**: Adjust threshold based on viewport size

## References

- [LTTB Algorithm Paper](https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf)
- [Recharts Performance Guide](https://recharts.org/en-US/guide)
- [React Performance Optimization](https://react.dev/reference/react/useMemo)
