
-- Migration to add face_descriptor to SITE_Users table
-- We use a jsonb column to store the descriptor array

ALTER TABLE "SITE_Users" 
ADD COLUMN IF NOT EXISTS face_descriptor jsonb;

-- Create an index for faster lookups (optional but good if we were doing vector search, but here we do in-memory or full scan filtering if needed, though for login we might just fetch all users with descriptors or match by email first if possible. 
-- But user wants "login identifying face", implying we don't type email.
-- So we need to compare against ALL users who have face descriptors.
-- Supabase/Postgres doesn't have built-in vector distance for JSONB arrays easily without pgvector extension.
-- We will fetch all users who have `face_descriptor` is not null, and compare on client side (face-api.js does this efficiently for small sets).
-- If user base is huge, we'd need pgvector. For now, client side comparison of descriptors is standard for small apps.