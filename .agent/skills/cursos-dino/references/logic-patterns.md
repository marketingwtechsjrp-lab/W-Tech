# System Logic Patterns: Cursos-Dino

## 1. Dynamic Landing Pages (LP)
Instead of creating 50 `.tsx` files, Cursos-Dino uses a single `CourseLP.tsx` component.

### Route Definition
`GET /curso/:slug`

### Data Fetching
1. Query `courses` where `slug = :slug`.
2. Query `course_dates` where `course_id = course.id` and `status = 'Open'`.
3. Render the content using themes or components (e.g., Glassmorphism for W-Tech style).

## 2. Enrollment Heavy Lifting
Automation for enrolling students:

1. **Conflict Check**: Check if student is already enrolled in a date for the same course.
2. **Capacity Validation**: Refuse enrollment if `enrolled_count >= max_capacity`.
3. **Ghost Inscriptions**: Create a 'Pending' enrollment before sending to Stripe to preserve the spot for X minutes.

## 3. Reporting & Management (Internal Skill Usage)
The skill can generate the following reports via SQL for the agent to present to the user:

- **List Students**: 
  ```sql
  SELECT s.full_name, s.email, e.status 
  FROM enrollments e 
  JOIN students s ON e.student_id = s.id 
  WHERE e.course_date_id = :date_id;
  ```
- **Revenue Report**: Sum of `transactions.amount` grouped by `course_id`.

## 4. LP Structure Recommendation
- **Hero**: Title, Subtitle, CTA to scroll to Dates.
- **Content**: `courses.full_content` (HTML/Markdown).
- **Dates Selector**: List `course_dates` with location and "Buy" button.
- **Instructor**: Bio and Image.
- **Social Proof**: Metadata testimonials.
