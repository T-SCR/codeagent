
-- Update RLS policies for code_matrix to allow authenticated users to insert data
DROP POLICY IF EXISTS "Authenticated users can manage code_matrix" ON public.code_matrix;

CREATE POLICY "Authenticated users can insert code_matrix" 
ON public.code_matrix 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update code_matrix" 
ON public.code_matrix 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete code_matrix" 
ON public.code_matrix 
FOR DELETE 
TO authenticated 
USING (true);

-- Update RLS policies for excel_mappings to ensure proper access
DROP POLICY IF EXISTS "Authenticated users can manage excel_mappings" ON public.excel_mappings;

CREATE POLICY "Authenticated users can insert excel_mappings" 
ON public.excel_mappings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update excel_mappings" 
ON public.excel_mappings 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete excel_mappings" 
ON public.excel_mappings 
FOR DELETE 
TO authenticated 
USING (true);

-- Update RLS policies for pdf_files to ensure proper access
DROP POLICY IF EXISTS "Authenticated users can manage pdf_files" ON public.pdf_files;

CREATE POLICY "Authenticated users can insert pdf_files" 
ON public.pdf_files 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pdf_files" 
ON public.pdf_files 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete pdf_files" 
ON public.pdf_files 
FOR DELETE 
TO authenticated 
USING (true);
