-- Helper function to generate random string
CREATE OR REPLACE FUNCTION random_string(length integer) RETURNS text AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
BEGIN
  IF length < 0 THEN
    raise exception 'Given length cannot be less than 0';
  END IF;
  for i in 1..length loop
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  end loop;
  return result;
END;
$$ LANGUAGE plpgsql;

-- Generate Test Enrollments
DO $$
DECLARE
    course_rec RECORD;
    i INTEGER;
    j INTEGER;
    student_first_names TEXT[] := ARRAY['Alex', 'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor', 'João', 'Kevin', 'Lucas', 'Matheus', 'Nathan', 'Otávio', 'Paulo', 'Rafael', 'Samuel', 'Thiago', 'Victor'];
    student_last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Moura'];
    methods TEXT[] := ARRAY['Pix', 'Credit Card', 'Debit Card', 'Cash'];
    statuses TEXT[] := ARRAY['Confirmed', 'Pending', 'CheckedIn'];
BEGIN
    FOR course_rec IN SELECT id, price FROM "SITE_Courses" LOOP
        -- Generate between 3 and 8 students per course
        FOR i IN 1..(3 + floor(random() * 6)::int) LOOP
            INSERT INTO "SITE_Enrollments" (
                course_id,
                student_name,
                student_email,
                student_phone,
                status,
                amount_paid,
                payment_method,
                created_at
            ) VALUES (
                course_rec.id,
                student_first_names[1 + floor(random() * array_length(student_first_names, 1))::int] || ' ' || student_last_names[1 + floor(random() * array_length(student_last_names, 1))::int],
                'student' || floor(random()*1000)::text || '@example.com',
                '119' || floor(random() * 89999999 + 10000000)::text,
                statuses[1 + floor(random() * array_length(statuses, 1))::int],
                CASE WHEN random() > 0.3 THEN course_rec.price ELSE course_rec.price * 0.5 END, -- 70% paid full, 30% partial
                methods[1 + floor(random() * array_length(methods, 1))::int],
                NOW() - (random() * interval '30 days')
            );
        END LOOP;
    END LOOP;
END $$;
