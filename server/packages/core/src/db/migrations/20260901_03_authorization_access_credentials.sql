ALTER TABLE `system_authorization_connection`
ADD COLUMN `cloudflare_access_client_id` text;

ALTER TABLE `system_authorization_connection`
ADD COLUMN `encrypted_cloudflare_access_client_secret` text;
