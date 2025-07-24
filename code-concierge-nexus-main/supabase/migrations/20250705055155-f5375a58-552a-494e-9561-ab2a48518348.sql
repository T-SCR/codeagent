-- Clear all existing sample data
DELETE FROM public.code_matrix;
DELETE FROM public.excel_mappings; 
DELETE FROM public.pdf_files;

-- Reset sequences if any
-- This ensures clean slate for new data