Build a Node.js Express backend that acts as an API gateway for a data preprocessing platform.

Responsibilities:
- Handle file uploads
- Manage dataset sessions
- Communicate with FastAPI service
- Store metadata in Supabase PostgreSQL
- Manage history and versioning

Routes:

POST /upload
- Upload dataset
- Generate dataset_id
- Store metadata in DB

GET /dataset/:id
- Return dataset info

POST /process/missing
POST /process/outliers
POST /process/encoding
POST /process/scaling

- Forward requests to FastAPI
- Save results and history

POST /visualize
- Forward visualization request to FastAPI

GET /history/:dataset_id
GET /history/:dataset_id/:version

POST /history/rollback
- Set selected version as current

GET /export/:dataset_id
- Return cleaned dataset

Database:
- Use Supabase PostgreSQL
- Store:
  - datasets
  - dataset_versions
  - operations_history

Ensure:
- Proper error handling
- Async request handling
- Secure file uploads