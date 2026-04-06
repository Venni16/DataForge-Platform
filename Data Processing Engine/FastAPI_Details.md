Build a FastAPI service for data cleaning and visualization.

Libraries:
- Pandas
- NumPy
- Scikit-learn
- Matplotlib
- Seaborn

Core Functionalities:

1. Load dataset using dataset_id

2. Data Cleaning:
- Handle missing values:
  - mean, median, mode, custom
- Remove duplicates
- Handle outliers:
  - IQR method
  - Z-score method

3. Feature Engineering:
- Encoding:
  - One-hot
  - Label encoding
- Scaling:
  - MinMaxScaler
  - StandardScaler

4. Visualization:
- Generate:
  - Histogram
  - Scatter plot
  - Box plot
  - Correlation heatmap
  - Pairplot
- Return images as base64

5. Version Control:
- After each operation:
  - Save dataset snapshot
  - Return version metadata

6. History Logging:
- Log:
  - operation name
  - parameters
  - timestamp
  - dataset shape

7. Rollback:
- Load dataset from specific version

Performance:
- Use caching (Redis optional)
- Optimize large dataset handling

API Endpoints:

POST /process/missing
POST /process/outliers
POST /process/encoding
POST /process/scaling
POST /visualize
POST /rollback