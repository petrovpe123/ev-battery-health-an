# 🔋 EV Battery Health Tracker

A professional-grade web application for analyzing electric vehicle battery performance through telemetry data visualization and AI-powered health insights. Track voltage trends, monitor temperature patterns, and receive intelligent recommendations for optimal battery maintenance.

![Battery Health Analysis](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 📊 Comprehensive Data Visualization
- **Interactive Charts**: Real-time voltage and temperature telemetry visualization using Recharts
- **Time-Series Analysis**: Track battery performance trends over time
- **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit on the fly
- **Data Summary Dashboard**: Quick overview of key metrics including average voltage, temperature, and time span

### 🤖 AI-Powered Analysis
- **Intelligent Health Assessment**: AI-generated battery condition analysis
- **Pattern Recognition**: Automatic detection of degradation trends and anomalies
- **Actionable Recommendations**: Receive specific maintenance and optimization suggestions
- **Technical Insights**: Deep analysis of voltage stability and thermal behavior

### 📁 Data Management
- **CSV File Upload**: Drag-and-drop or click to upload battery telemetry data
- **Format Validation**: Automatic validation of CSV structure and data integrity
- **Local Persistence**: Data stored in browser for future sessions
- **Large File Support**: Progress indicators and optimized processing for extensive datasets

### 📄 PDF Report Export
- **Professional Reports**: Generate comprehensive battery health reports
- **Complete Analysis**: Includes health score, charts data, AI summary, and recommendations
- **Shareable Format**: Download and share PDF documents for archival or review

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/petrovpe123/ev-battery-health-an.git
   cd ev-battery-health-an
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## 📖 Usage

### CSV File Format

Your battery telemetry CSV file must include the following columns:

```csv
timestamp,voltage,temperature
2024-01-01T10:00:00Z,3.85,25.5
2024-01-01T10:05:00Z,3.83,26.0
2024-01-01T10:10:00Z,3.82,26.2
```

**Column Requirements:**
- `timestamp`: ISO 8601 format date-time string (e.g., `2024-01-01T10:00:00Z`)
- `voltage`: Numeric value in volts (e.g., `3.85`)
- `temperature`: Numeric value in Celsius (e.g., `25.5`)

### Step-by-Step Guide

1. **Upload Your Data**
   - Click the upload area or drag and drop your CSV file
   - Wait for validation and processing to complete

2. **Review the Dashboard**
   - View data summary with key metrics
   - Examine interactive charts for voltage and temperature trends
   - Toggle between Celsius and Fahrenheit as needed

3. **Analyze Battery Health**
   - Review the AI-generated health analysis
   - Check voltage stability assessments
   - Read thermal behavior insights
   - Follow maintenance recommendations

4. **Export Report** (Optional)
   - Click "Export PDF" to download a comprehensive report
   - Share the report with maintenance teams or for record-keeping

5. **Upload New Data** (Optional)
   - Scroll to the bottom to upload additional datasets
   - Or click "Reset" to start fresh with new data

## 🛠️ Technology Stack

### Frontend Framework
- **React 19** - Modern UI library with concurrent rendering
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server

### UI Components & Styling
- **Radix UI** - Accessible, unstyled component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** & **Phosphor Icons** - Icon libraries
- **Framer Motion** - Animation library

### Data Visualization
- **Recharts** - Composable charting library built on D3
- **D3.js** - Data-driven transformations

### AI Integration
- **GitHub Spark** - AI-powered analysis capabilities

### Utilities
- **date-fns** - Date manipulation and formatting
- **jsPDF** - PDF generation for reports
- **zod** - Schema validation
- **sonner** - Toast notifications

## 🏗️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Optimize dependencies
npm run optimize

# Kill port 5000 process (if needed)
npm run kill
```

### Project Structure

```
ev-battery-health-an/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   ├── FileUpload.tsx
│   │   ├── BatteryCharts.tsx
│   │   └── AnalysisPanel.tsx
│   ├── lib/             # Utility functions
│   │   ├── types.ts     # TypeScript type definitions
│   │   ├── battery-analysis.ts
│   │   ├── pdf-export.ts
│   │   └── utils.ts
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── package.json         # Project dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready to be deployed to any static hosting service.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Write clean, maintainable TypeScript code
- Follow existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly before submitting
- Update documentation as needed

## 🐛 Known Edge Cases

The application handles various edge cases gracefully:

- **Invalid CSV Format**: Clear error messages with format examples
- **Missing Data Points**: Graceful handling of gaps in telemetry
- **Large Files**: Progress indicators and performance optimization
- **No Data State**: Empty state with upload instructions
- **AI Analysis Failure**: Fallback to basic statistics summary
- **PDF Export Before Analysis**: Disabled button with helpful toast message

## 📋 Requirements

For detailed product requirements and design specifications, see [PRD.md](PRD.md).

## 🔒 Security

For information about reporting security vulnerabilities, see [SECURITY.md](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) GitHub, Inc.

## 🙏 Acknowledgments

- Built with [GitHub Spark](https://github.com/github/spark)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Icons from [Phosphor Icons](https://phosphoricons.com/) and [Lucide](https://lucide.dev/)

---

**Made with ⚡ by [petrovpe123](https://github.com/petrovpe123)**
