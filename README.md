# Garment Flow Scheduler

A comprehensive production scheduling application for garment manufacturing operations. This tool helps production managers plan, visualize, and optimize workflow across different garment production processes.

## 🌟 Features

### Production Process Management
- **Multi-Process Scheduling**: Manage cutting, sewing, finishing, and packing operations
- **Primary Process Control**: Set sewing as the primary process with automatic offset scheduling for other processes
- **Process Dependencies**: Configure working day offsets between processes
- **Manual Override**: Take manual control of specific process schedules when needed
- **Freeze Protection**: Lock specific process schedules to prevent automatic recalculation

### Interactive Timeline Management
- **Visual Timeline**: Drag-and-drop interface for adjusting production schedules
- **Resizable Production Strips**: Adjust duration and start dates with mouse or keyboard controls
- **Working Calendar**: Configure weekends and holidays to automatically skip non-working days
- **Auto-balancing**: Maintain total quantity consistency across all processes

### Advanced Grid Visualization
- **Multi-Level Views**: Switch between strip, planning unit, order, and style level aggregations
- **Editable Cells**: Click any cell to modify quantities with automatic total balancing
- **Date Range Navigation**: Flexible date window controls with quick navigation buttons
- **Holiday Management**: Visual indicators for weekends and holidays

### Export & Reporting
- **Excel Export**: Download complete schedules in Excel format with metadata
- **Multiple View Levels**: Export data at different aggregation levels
- **Formatted Output**: Professional formatting with proper headers and styling

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-git-url>
   cd garment-flow-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Start production server (port 8080)
npm run start

# Preview production build
npm run start:preview
```

## 🎯 How to Use

### 1. Configure Working Days
- Set weekends as working or non-working days
- Add holidays by selecting dates in the calendar
- These settings affect all automatic scheduling calculations

### 2. Set Primary Schedule (Sewing)
- Use the interactive timeline to set sewing start date and duration
- Adjust total quantity using the input controls
- Drag the blue strip to move the schedule
- Use side handles to resize the duration
- Keyboard shortcuts: Arrow keys to move, Shift+Arrow to resize

### 3. Configure Process Offsets
- Set working day offsets for each process relative to sewing
- Negative values mean the process starts before sewing
- Positive values mean the process starts after sewing
- Changes automatically recalculate dependent schedules

### 4. Manual Schedule Adjustments
- Click any cell in the schedule grid to edit quantities
- System automatically balances totals across processes
- Use the freeze button (🔒) to prevent automatic recalculation
- Reset button (↻) returns to automatic scheduling

### 5. View Different Aggregation Levels
- **Strip Level**: Base level, fully editable (multiplier: 1x)
- **Planning Unit Level**: Summary view (multiplier: 2.5x)
- **Order Level**: Higher aggregation (multiplier: 7x)
- **Style Level**: Highest aggregation (multiplier: 10x)

### 6. Export Data
- Click the "Excel" button to download current schedule
- Export includes metadata, date ranges, and all process data
- File naming includes current date and view level

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Data Grid**: AG Grid Community
- **Charts**: Recharts
- **Excel Export**: SheetJS (xlsx)
- **State Management**: React hooks and Context
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── components/
│   ├── ProcessesGrid.tsx     # Main application container
│   ├── ScheduleGrid.tsx      # Interactive schedule grid
│   ├── SewingTimeline.tsx    # Timeline drag-and-drop interface
│   └── ui/                   # Reusable UI components
├── pages/
│   ├── Index.tsx            # Main page
│   └── NotFound.tsx         # 404 page
├── hooks/                   # Custom React hooks
├── lib/
│   └── utils.ts            # Utility functions
└── App.tsx                 # Main application component
```

## 🔧 Configuration

### Working Calendar Settings
- **Weekends Off**: Toggle to include/exclude weekends
- **Holidays**: Add specific dates to exclude from working days
- All scheduling calculations respect these settings

### Process Configuration
Each process has:
- **Name**: Display name (Cutting, Sewing, Finishing, Packing)
- **Icon**: Visual identifier
- **Offset Days**: Working days relative to primary process
- **Status**: pending, in-progress, completed
- **Manual Override**: Flag for manual schedule control
- **Frozen**: Flag to prevent automatic recalculation

## 📊 Data Flow

1. **Primary Schedule**: Sewing timeline defines the base schedule
2. **Offset Calculation**: Other processes calculated based on working day offsets
3. **Manual Override**: Individual cell edits override automatic calculations
4. **Balance Maintenance**: System maintains total quantity consistency
5. **View Aggregation**: Data scaled by view level multipliers

## 🎨 UI Features

- **Responsive Design**: Works on desktop and tablet devices
- **Visual Indicators**: Color coding for different process states
- **Interactive Elements**: Hover effects and visual feedback
- **Keyboard Support**: Full keyboard navigation and shortcuts
- **Accessibility**: ARIA labels and semantic HTML

## 🚧 Development

### Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - ESLint code checking
- `npm run start` - Production server on port 8080

### Key Dependencies
- React Router DOM for navigation
- TanStack Query for state management
- React Hook Form for form handling
- Zod for schema validation
- Various Radix UI components for accessibility

## 📝 License

This project is built with modern web technologies and follows React best practices for maintainable, scalable code.

---

For support or questions about this application, please refer to the code documentation or contact the development team.
