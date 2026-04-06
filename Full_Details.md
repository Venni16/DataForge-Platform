Build a full-stack web application called "DataPrep Pro" that provides an end-to-end data cleaning, preprocessing, visualization, and history tracking platform for machine learning workflows.

Architecture:
- Frontend: React.js with Tailwind CSS
- Backend API Gateway: Node.js with Express.js
- Data Processing Service: Python FastAPI
- Database: PostgreSQL using Supabase
- Cache Layer: Redis (optional but recommended)

Core Features:
1. Dataset upload (CSV, Excel)
2. Step-by-step data cleaning pipeline
3. Feature engineering tools
4. Dynamic visualization dashboard (Matplotlib, Seaborn)
5. Full history tracking with version control
6. Rollback and replay pipeline
7. Export cleaned dataset
8. Save and load pipelines

System Design Requirements:
- Follow modular microservices architecture
- Maintain dataset versioning
- Ensure reproducibility of transformations
- Optimize for performance and scalability
- Use REST APIs between services
- Maintain session-based dataset tracking

Each dataset should have:
- Unique dataset_id
- Version-controlled transformations
- Full history of operations
- Ability to rollback or branch

The UI must be tab-based with the following tabs:
1. Upload
2. Overview
3. Missing Values
4. Cleaning
5. Feature Engineering
6. Visualization
7. History
8. Export

Focus on production-grade code, clean architecture, and scalability.