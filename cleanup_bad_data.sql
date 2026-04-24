-- CLEANUP SCRIPT FOR CORRUPTED PRODUCT DATA
-- Deletes products that contain HTML tags in their name due to bad CSV import.

DELETE FROM "SITE_Products" 
WHERE name LIKE '%<article%' 
   OR name LIKE '%<div%'
   OR name LIKE '%&lt;article%';

-- Optional: Delete all products if the user wants a completely fresh start
-- DELETE FROM "SITE_Products";
