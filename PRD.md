# EV Battery Health Tracker

Track and analyze electric vehicle battery performance through telemetry data visualization and AI-powered health insights.

**Experience Qualities**:
1. **Professional** - Clean, technical interface that inspires confidence in data analysis
2. **Insightful** - Clear visualization and meaningful AI analysis that reveals battery patterns
3. **Efficient** - Quick upload-to-insight workflow with minimal friction

**Complexity Level**: Light Application (multiple features with basic state)
- Combines file upload, data visualization, and AI analysis in a focused battery monitoring tool

## Essential Features

### CSV File Upload
- **Functionality**: Accept CSV files with timestamp, voltage, temperature columns
- **Purpose**: Enable users to import their battery telemetry data
- **Trigger**: User clicks upload area or drags file
- **Progression**: Select file → validate format → upload → process data → display results
- **Success criteria**: File parsed correctly, data extracted and stored

### Battery Data Visualization
- **Functionality**: Interactive charts showing voltage and temperature over time
- **Purpose**: Visual pattern recognition for battery performance trends
- **Trigger**: Successful file upload completion
- **Progression**: Data processed → charts rendered → interactive exploration available
- **Success criteria**: Clear, responsive charts with hover details and time-based trends

### AI Health Analysis
- **Functionality**: Generate intelligent summary of battery condition and recommendations
- **Purpose**: Provide actionable insights beyond raw data visualization
- **Trigger**: After data visualization completes
- **Progression**: Chart data analyzed → AI processing → health summary displayed
- **Success criteria**: Relevant, technical analysis with specific recommendations

### Data Persistence
- **Functionality**: Save uploaded data and analysis results
- **Purpose**: Allow users to revisit previous battery analyses
- **Trigger**: Successful upload and analysis
- **Progression**: Data processed → stored locally → accessible for future sessions
- **Success criteria**: Data persists between browser sessions

### PDF Report Export
- **Functionality**: Download comprehensive battery health report as PDF document
- **Purpose**: Enable users to save, share, and archive analysis results professionally
- **Trigger**: User clicks Export PDF button after analysis completes
- **Progression**: Analysis complete → user clicks export → PDF generated → file downloaded
- **Success criteria**: Well-formatted PDF with health score, charts data, AI summary, and recommendations

## Edge Case Handling
- **Invalid CSV Format**: Clear error message with format example
- **Missing Data Points**: Handle gaps in telemetry gracefully
- **Large Files**: Progress indicators and performance optimization
- **No Data**: Empty state with upload instructions
- **AI Analysis Failure**: Fallback to basic statistics summary
- **PDF Export Before Analysis**: Disable button until analysis completes with helpful toast message

## Design Direction
Professional and technical aesthetic that conveys precision and reliability, similar to automotive diagnostic tools. Clean interface that lets data visualization take center stage.

## Color Selection
Analogous (adjacent colors on color wheel) - Using blue-green technical palette that evokes automotive displays and scientific instruments.

- **Primary Color**: Deep Electric Blue (oklch(0.45 0.15 240)) - Communicates reliability and technical precision
- **Secondary Colors**: Steel Gray (oklch(0.65 0.02 240)) for supporting UI elements and neutral backgrounds
- **Accent Color**: Bright Cyan (oklch(0.75 0.12 200)) - Attention-grabbing highlight for data points and CTAs
- **Foreground/Background Pairings**:
  - Background (Pure White oklch(1 0 0)): Dark Blue text (oklch(0.2 0.05 240)) - Ratio 8.2:1 ✓
  - Card (Light Gray oklch(0.98 0.01 240)): Dark Blue text (oklch(0.2 0.05 240)) - Ratio 7.8:1 ✓
  - Primary (Electric Blue oklch(0.45 0.15 240)): White text (oklch(1 0 0)) - Ratio 5.1:1 ✓
  - Accent (Bright Cyan oklch(0.75 0.12 200)): Dark Blue text (oklch(0.2 0.05 240)) - Ratio 6.3:1 ✓

## Font Selection
Technical typeface that balances readability with precision, using Inter for its excellent screen clarity and data display characteristics.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing
  - H3 (Chart Labels): Inter Medium/18px/normal spacing
  - Body (Analysis Text): Inter Regular/16px/relaxed line height
  - Data (Numbers): Inter Medium/14px/tabular numerals

## Animations
Subtle functional animations that guide attention to data insights without overwhelming the technical content.

- **Purposeful Meaning**: Motion emphasizes data flow from upload to visualization to analysis
- **Hierarchy of Movement**: Chart animations reveal data progressively, AI analysis types in to suggest real-time processing

## Component Selection
- **Components**: 
  - Card components for upload area and analysis sections
  - Progress indicators for file processing
  - Alert components for error states
  - Custom chart components using recharts
  - Button variants for upload and analysis actions
- **Customizations**: 
  - Upload dropzone with file drag/drop styling
  - Chart container with technical grid styling
  - AI analysis panel with typewriter effect
- **States**: 
  - Upload button: idle, hover, uploading, success, error
  - Charts: loading skeleton, populated, interactive
  - Analysis: loading, generating, complete
- **Icon Selection**: 
  - Upload: cloud-arrow-up for file upload
  - Battery: battery for health status
  - Chart: chart-line for data visualization
  - AI: sparkles for analysis generation
  - Export: file-pdf for PDF download
- **Spacing**: Consistent 16px/24px rhythm using Tailwind's spacing scale
- **Mobile**: 
  - Single column layout with full-width charts
  - Touch-optimized upload area
  - Collapsible analysis sections for readability