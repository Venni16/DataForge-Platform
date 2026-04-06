Build a React.js frontend using Tailwind CSS for a data preprocessing platform.

Requirements:

1. Layout:
- Sidebar with tabs:
  - Upload
  - Overview
  - Missing Values
  - Cleaning
  - Feature Engineering
  - Visualization
  - History
  - Export

2. Upload Tab:
- File upload (CSV/XLSX)
- Preview first 10 rows

3. Overview Tab:
- Show dataset shape
- Column types
- Missing values summary
- Basic statistics

4. Cleaning Tabs:
- Missing values handling:
  - Fill (mean, median, mode, custom)
  - Drop rows/columns
- Duplicate removal
- Outlier detection (IQR, Z-score)

5. Feature Engineering:
- Encoding (One-hot, Label)
- Scaling (MinMax, StandardScaler)

6. Visualization Tab:
- Dropdowns:
  - Chart type (histogram, scatter, box, heatmap, pairplot)
  - Column selection
- Render charts returned from backend (base64 images)

7. History Tab:
- Timeline UI (like Git commits)
- Show:
  - Version number
  - Operation performed
  - Timestamp
- On click:
  - Show dataset preview
  - Show transformation details
- Buttons:
  - Rollback
  - Compare versions

8. Export Tab:
- Download cleaned dataset
- Save pipeline config

State Management:
- Use React Context or Redux
- Store dataset_id and current_version

API Integration:
- Connect to Express backend via REST APIs

UI/UX:
- Clean dashboard UI
- Responsive design
- Use cards, tables, modals