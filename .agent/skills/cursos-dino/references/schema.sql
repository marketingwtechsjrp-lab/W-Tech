-- Cursos-Dino: Professional Course System Schema (Neon/Postgres)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Courses (The Product definition)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    full_content TEXT, -- Markdown or HTML for the LP
    image_url TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'BRL',
    instructor_name TEXT,
    instructor_bio TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Course Dates (The specific instances/events)
CREATE TABLE IF NOT EXISTS course_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    date_start DATE NOT NULL,
    date_end DATE,
    time_start TIME,
    time_end TIME,
    location_name TEXT NOT NULL, -- e.g. "São Paulo", "Lisboa", "Online"
    location_address TEXT,
    map_url TEXT,
    max_capacity INTEGER,
    enrolled_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('Open', 'Closed', 'Cancelled', 'Full')) DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    document_id TEXT, -- CPF, NIF, etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enrollments (The link between Student and Date)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id),
    course_date_id UUID REFERENCES course_dates(id),
    status TEXT CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Refunded')) DEFAULT 'Pending',
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    payment_method TEXT, -- 'Stripe', 'Pix', 'Manual'
    stripe_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transactions (Financial Audit Log)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES enrollments(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    status TEXT NOT NULL,
    provider TEXT DEFAULT 'Stripe',
    provider_id TEXT, -- Stripe Charge/PaymentIntent ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_course_dates_course ON course_dates(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_date ON enrollments(course_date_id);
CREATE INDEX IF NOT EXISTS idx_transactions_enrollment ON transactions(enrollment_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
