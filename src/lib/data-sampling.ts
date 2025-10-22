import { BatteryReading } from './types';

/**
 * Intelligently samples data points from a large dataset to improve chart performance
 * while maintaining visual fidelity. Uses Largest-Triangle-Three-Buckets (LTTB) algorithm.
 * 
 * @param data - Array of battery readings
 * @param threshold - Maximum number of points to return (default: 500)
 * @returns Sampled array of battery readings
 */
export function sampleData(data: BatteryReading[], threshold: number = 500): BatteryReading[] {
  // If data is already small enough, return as-is
  if (data.length <= threshold) {
    return data;
  }

  // Always keep first and last points
  const sampled: BatteryReading[] = [];
  sampled.push(data[0]);

  // Calculate bucket size
  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0; // Initially point a is the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (for line optimization)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += new Date(data[j].timestamp).getTime();
      avgY += data[j].voltage; // Using voltage as primary metric
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointAX = new Date(data[a].timestamp).getTime();
    const pointAY = data[a].voltage;

    let maxArea = -1;
    let maxAreaPoint = 0;

    for (let j = rangeOffs; j < rangeTo; j++) {
      // Calculate triangle area over three buckets
      const pointX = new Date(data[j].timestamp).getTime();
      const pointY = data[j].voltage;
      
      const area = Math.abs(
        (pointAX - avgX) * (pointY - pointAY) -
        (pointAX - pointX) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]); // Pick the point with the largest area
    a = maxAreaPoint; // This point is the next a
  }

  sampled.push(data[data.length - 1]); // Always add last point

  return sampled;
}

/**
 * Determines if dots should be shown on the chart based on dataset size
 * @param dataLength - Number of data points
 * @returns boolean indicating if dots should be shown
 */
export function shouldShowDots(dataLength: number): boolean {
  return dataLength <= 100;
}
