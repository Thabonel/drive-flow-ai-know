-- Fix function search_path security warnings
-- Set immutable search_path for all match_memories function variants
ALTER FUNCTION public.match_memories(extensions.vector, integer) SET search_path = public;
ALTER FUNCTION public.match_memories(extensions.vector, double precision, integer, text, text) SET search_path = public;
ALTER FUNCTION public.match_memories(text, integer) SET search_path = public;

-- Set immutable search_path for match_documents function
ALTER FUNCTION public.match_documents(extensions.vector, integer, jsonb) SET search_path = public;

-- Set immutable search_path for all match_qa_documents function variants
ALTER FUNCTION public.match_qa_documents(extensions.vector, uuid, uuid, double precision, integer) SET search_path = public;
ALTER FUNCTION public.match_qa_documents(extensions.vector, double precision, integer) SET search_path = public;