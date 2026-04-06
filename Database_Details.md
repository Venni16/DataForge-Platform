Design a PostgreSQL database schema for a data preprocessing platform using Supabase.

Tables:

1. datasets
- id (uuid, primary key)
- name (text)
- created_at (timestamp)
- current_version (int)

2. dataset_versions
- id (uuid)
- dataset_id (foreign key)
- version_number (int)
- file_path (text)  // stored dataset snapshot
- rows (int)
- columns (int)
- created_at (timestamp)

3. operations_history
- id (uuid)
- dataset_id (foreign key)
- version_number (int)
- operation (text)
- parameters (jsonb)
- timestamp (timestamp)

4. pipeline_configs
- id (uuid)
- dataset_id (foreign key)
- config (jsonb)
- created_at (timestamp)

Indexes:
- dataset_id indexes for fast lookup

Constraints:
- Foreign key relationships
- Cascade delete on dataset removal