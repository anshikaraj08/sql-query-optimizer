export const sampleSql = `SELECT *
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE LOWER(u.email) = 'user42@example.com'
  AND o.status = 'paid';`;

export const sampleDdl = `CREATE TABLE users (id INT PRIMARY KEY, email TEXT NOT NULL, country TEXT NOT NULL);
CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE TABLE orders (id INT PRIMARY KEY, user_id INT NOT NULL, status TEXT NOT NULL, total NUMERIC, created_at TIMESTAMP NOT NULL);`;
