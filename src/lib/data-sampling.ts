/**
 * Largest Triangle Three Buckets (LTTB) Downsampling Algorithm
 * 
 * This advanced algorithm maintains the visual characteristics of the data
 * while significantly reducing the number of points. It works by:
 * 1. Always keeping the first and last data points
 * 2. Dividing remaining data into buckets
 * 3. For each bucket, selecting the point that forms the largest triangle
 *    with the previous selected point and the average of the next bucket
 * 
 * This preserves peaks, valleys, and overall trends better than simple
 * sampling methods like taking every nth point.
 * 
 * Reference: Sveinn Steinarsson (2013)
 * https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 */

export interface DataPoint {
  [key: string]: any;
  timestamp?: string;
  time?: number;
}

/**
 * Calculate the area of a triangle formed by three points
 */
function triangleArea(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number {
  return Math.abs(
    (pointA.x - pointC.x) * (pointB.y - pointA.y) - 
    (pointA.x - pointB.x) * (pointC.y - pointA.y)
  ) / 2;
}

/**
 * LTTB Downsampling Algorithm
 * 
 * @param data - Array of data points to sample
 * @param threshold - Target number of points after sampling
 * @param xKey - Key to use for x-axis values (defaults to 'time' or 'timestamp')
 * @param yKey - Key to use for y-axis values (defaults to first numeric key found)
 * @returns Downsampled array of data points
 */
export function downsampleLTTB<T extends DataPoint>(
  data: T[],
  threshold: number,
  xKey?: string,
  yKey?: string
): T[] {
  // If data is smaller than threshold, return as-is
  if (data.length <= threshold) {
    return data;
  }

  // Ensure threshold is at least 3 (first, last, and at least one middle point)
  threshold = Math.max(3, threshold);

  // Auto-detect keys if not provided
  if (!xKey) {
    xKey = 'time' in data[0] ? 'time' : 'timestamp';
  }
  
  if (!yKey) {
    // Find first numeric key that isn't the x key
    for (const key in data[0]) {
      if (key !== xKey && typeof data[0][key] === 'number') {
        yKey = key;
        break;
      }
    }
  }

  if (!yKey) {
    throw new Error('Could not determine y-axis key for sampling');
  }

  const sampled: T[] = [];
  
  // Always keep first point
  sampled.push(data[0]);

  // Bucket size (excluding first and last points)
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Index of the point selected in the previous bucket
  let prevSelectedIndex = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate bucket range
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
    
    // Calculate average point in the next bucket (for triangle calculations)
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
    
    let avgX = 0;
    let avgY = 0;
    let avgRangeLength = 0;

    // Calculate average of next bucket
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      const xVal = data[j][xKey!];
      const yVal = data[j][yKey!];
      
      // Handle both string timestamps and numeric times
      const x = typeof xVal === 'string' ? new Date(xVal).getTime() : xVal;
      
      avgX += x;
      avgY += yVal;
      avgRangeLength++;
    }

    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }

    // Point in the previous bucket that was selected
    const prevX = typeof data[prevSelectedIndex][xKey!] === 'string' 
      ? new Date(data[prevSelectedIndex][xKey!] as string).getTime()
      : data[prevSelectedIndex][xKey!];
    const prevY = data[prevSelectedIndex][yKey!];

    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const currX = typeof data[j][xKey!] === 'string'
        ? new Date(data[j][xKey!] as string).getTime()
        : data[j][xKey!];
      const currY = data[j][yKey!];

      const area = triangleArea(
        { x: prevX, y: prevY },
        { x: currX, y: currY },
        { x: avgX, y: avgY }
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex]);
    prevSelectedIndex = maxAreaIndex;
  }

  // Always keep last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Apply downsampling to multiple data series with different y-axes
 * This ensures consistent sampling across multiple metrics
 */
export function downsampleMultiSeries<T extends DataPoint>(
  data: T[],
  threshold: number,
  xKey?: string,
  yKeys?: string[]
): T[] {
  if (data.length <= threshold) {
    return data;
  }

  // If no y-keys provided, use the first numeric key
  if (!yKeys || yKeys.length === 0) {
    return downsampleLTTB(data, threshold, xKey);
  }

  // Sample based on the first y-key
  return downsampleLTTB(data, threshold, xKey, yKeys[0]);
}

/**
 * Configuration for adaptive sampling
 */
export interface SamplingConfig {
  /** Apply sampling when data exceeds this threshold */
  threshold: number;
  /** Target number of points after sampling */
  targetPoints: number;
}

/**
 * Default sampling configuration
 */
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  threshold: 500,      // Start sampling when data has more than 500 points
  targetPoints: 300    // Downsample to approximately 300 points
};

/**
 * Adaptive sampling that only applies downsampling when needed
 */
export function adaptiveSample<T extends DataPoint>(
  data: T[],
  config: Partial<SamplingConfig> = {},
  xKey?: string,
  yKey?: string
): T[] {
  const { threshold, targetPoints } = { ...DEFAULT_SAMPLING_CONFIG, ...config };
  
  if (data.length <= threshold) {
    return data;
  }

  return downsampleLTTB(data, targetPoints, xKey, yKey);
}
