INSERT INTO social_profiles (platform, label, url)
VALUES ('facebook', 'Facebook', 'https://www.facebook.com/profile.php?id=61593191562395')
ON CONFLICT (platform) DO UPDATE
SET url = EXCLUDED.url, label = EXCLUDED.label, updated_at = now();
