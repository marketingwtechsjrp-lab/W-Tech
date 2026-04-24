# Cursos-Dino: Management & Financial Reports

This guide provides the SQL queries and logic for generating reports within the Cursos-Dino engine.

## 1. Student Enrollment Lists
To see who is attending a specific date:

```sql
SELECT 
    s.full_name, 
    s.email, 
    s.phone, 
    e.status as enrollment_status,
    e.amount_paid,
    e.payment_method
FROM enrollments e
JOIN students s ON e.student_id = s.id
WHERE e.course_date_id = :date_id
ORDER BY s.full_name ASC;
```

## 2. Financial Receipt Report (Daily/Monthly)
Keep track of all incoming payments.

```sql
SELECT 
    DATE(created_at) as payment_date,
    SUM(amount) as total_revenue,
    currency,
    COUNT(*) as transaction_count
FROM transactions
WHERE status = 'Succeeded'
GROUP BY 1, 3
ORDER BY 1 DESC;
```

## 3. General Management Dashboard Data
Overview of the system's health.

```sql
-- Course popularity
SELECT 
    c.title, 
    SUM(cd.enrolled_count) as total_students,
    SUM(e.amount_paid) as revenue
FROM courses c
JOIN course_dates cd ON c.id = cd.course_id
JOIN enrollments e ON cd.id = e.course_date_id
WHERE e.status = 'Confirmed'
GROUP BY c.id;

-- Occupancy Rate
SELECT 
    location_name, 
    date_start,
    (enrolled_count::float / max_capacity::float) * 100 as occupancy_percentage
FROM course_dates
WHERE status = 'Open';
```

## 4. Manual Receivings (For Offline Payments)
If a student pays via Bank Transfer or Pix outside Stripe:
1. Update `enrollments.amount_paid`.
2. Set `enrollments.status = 'Confirmed'`.
3. Set `enrollments.payment_method = 'Manual'`.
4. Insert a record in `transactions` with `provider = 'Manual'`.
