-- Execute this in your Supabase SQL Editor
ALTER TABLE "public"."SITE_Mechanics" ADD COLUMN IF NOT EXISTS "cpf_cnpj" text;
ALTER TABLE "public"."SITE_Mechanics" ADD COLUMN IF NOT EXISTS "group" text;
