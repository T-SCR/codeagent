-- Insert default PDF content data
INSERT INTO public.pdf_files (filename, content_text, file_path, file_size, processed_at) VALUES
('CODE_Framework_Overview.pdf', 'The C-O-D-E Framework consists of four main phases: Conceptualize, Organize, Deploy, and Evolve. Each phase contains specific canvases and tools to guide innovation and execution...', '/assets/pdfs/CODE_Framework_Overview.pdf', 1024000, now()),
('VPC_Canvas_Guide.pdf', 'The Value Proposition Canvas (VPC) is a strategic tool that helps organizations understand customer needs and design value propositions. It consists of two main components: Customer Profile and Value Map...', '/assets/pdfs/VPC_Canvas_Guide.pdf', 856000, now()),
('Innovation_Tools.pdf', 'This document outlines the key innovation tools available in the CODE framework including brainstorming techniques, ideation methods, and validation processes...', '/assets/pdfs/Innovation_Tools.pdf', 750000, now());

-- Insert default CODE matrix data
INSERT INTO public.code_matrix (code_block, worksheet_name, phase, canvas_type, tool_name, description, filename, keywords) VALUES
('CODE12', 'Value Proposition Canvas', 'Conceptualize', 'VPC', 'Customer Insights', 'Core tool for understanding customer needs and designing value propositions', 'CODEMatrix.xlsx', ARRAY['value proposition', 'customer', 'insights']),
('CODE15', 'Business Model Canvas', 'Organize', 'BMC', 'Business Structure', 'Framework for developing and documenting business models', 'CODEMatrix.xlsx', ARRAY['business model', 'strategy', 'structure']),
('CODE23', 'Innovation Canvas', 'Deploy', 'IC', 'Innovation Process', 'Systematic approach to innovation implementation', 'CODEMatrix.xlsx', ARRAY['innovation', 'implementation', 'process']),
('CODE31', 'Evolution Matrix', 'Evolve', 'EM', 'Continuous Improvement', 'Framework for continuous evolution and improvement', 'CODEMatrix.xlsx', ARRAY['evolution', 'improvement', 'growth']);

-- Insert default Excel mappings
INSERT INTO public.excel_mappings (query_term, pdf_filename, category, description) VALUES
('CODE12', 'VPC_Canvas_Guide.pdf', 'Framework', 'Value Proposition Canvas information and usage'),
('VPC Canvas', 'VPC_Canvas_Guide.pdf', 'Canvas', 'Complete VPC canvas documentation'),
('Conceptualize phase', 'CODE_Framework_Overview.pdf', 'Phase', 'First phase of CODE framework'),
('Innovation tools', 'Innovation_Tools.pdf', 'Tools', 'Collection of innovation methodologies'),
('Customer insights', 'VPC_Canvas_Guide.pdf', 'Process', 'Customer research and insight gathering'),
('Business model', 'CODE_Framework_Overview.pdf', 'Strategy', 'Business model development guidance');