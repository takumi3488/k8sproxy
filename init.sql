-- ceate url_maps table
CREATE TABLE url_maps (
    subdomain TEXT PRIMARY KEY,
    proxy_to TEXT NOT NULL,
    is_secure BOOLEAN NOT NULL
);
CREATE INDEX url_maps_proxy_to_index ON url_maps USING HASH (subdomain);

-- insert sample data
INSERT INTO url_maps (subdomain, proxy_to, is_secure) VALUES
('public', 'http://nginx:80', false),
('private', 'http://nginx:80', true);
