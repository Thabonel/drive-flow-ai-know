-- Set Microsoft token encryption key as a database configuration parameter
-- This key is used by the store_encrypted_microsoft_token and get_decrypted_microsoft_token functions

ALTER DATABASE postgres SET app.microsoft_token_encryption_key = '3rIqniUYJtU2zqs4h8f9G8WBRbpQuT/T12uMxtvnbeM=';
