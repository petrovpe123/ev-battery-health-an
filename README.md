# EV Battery Health Tracker

Track and analyze electric vehicle battery performance through telemetry data visualization and AI-powered health insights.

## Features

- 📊 **Interactive Data Visualization**: View battery voltage and temperature trends over time
- 🤖 **AI-Powered Analysis**: Get intelligent insights about battery health and performance
- 📁 **CSV File Upload**: Import battery telemetry data from CSV files
- 💾 **Data Persistence**: Save and revisit previous battery analyses
- 📄 **PDF Reports**: Export comprehensive battery health reports
- 🌡️ **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit
- ⚡ **High-Performance Charts**: Advanced LTTB sampling algorithm for smooth rendering of large datasets

## Performance Optimization

This application uses the **LTTB (Largest Triangle Three Buckets)** algorithm for chart optimization, ensuring smooth performance even with datasets containing thousands of data points. The algorithm intelligently reduces data points while preserving visual patterns and important trends.

For more details, see [Chart Performance Optimization Documentation](./docs/CHART_PERFORMANCE_OPTIMIZATION.md).

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Data Format

Upload CSV files with the following columns:
- `timestamp`: ISO 8601 format date/time
- `voltage`: Battery voltage in volts
- `temperature`: Temperature in Celsius

Example:
```csv
timestamp,voltage,temperature
2024-01-01T00:00:00Z,12.4,25.5
2024-01-01T00:01:00Z,12.3,25.7
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives
- **Spark** - GitHub's development platform

## Architecture

- `/src/components` - React components
- `/src/lib` - Utility functions and business logic
  - `data-sampling.ts` - LTTB downsampling algorithm
  - `battery-analysis.ts` - AI analysis logic
  - `pdf-export.ts` - PDF generation
- `/docs` - Documentation

## License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
