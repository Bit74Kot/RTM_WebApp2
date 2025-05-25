/*
  # Document Manager Database Schema

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `content` (text) - Template content
      - `type` (text) - Template type (contract, invoice, act)
      - `created_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users
      
    - `placeholders`
      - `id` (uuid, primary key)
      - `template_id` (uuid) - Reference to templates
      - `name` (text) - Placeholder name
      - `value` (text) - Placeholder value
      - `created_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users
      
    - `requisites`
      - `id` (uuid, primary key)
      - `value` (text) - Requisite value
      - `type` (text) - Requisite type (name, company, inn, ogrn, etc)
      - `created_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  3. Functions
    - `match_requisites` - Function to match requisites to placeholders
*/

-- Create templates table
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('contract', 'invoice', 'act')),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create placeholders table
CREATE TABLE placeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE placeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own placeholders"
  ON placeholders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create requisites table
CREATE TABLE requisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE requisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own requisites"
  ON requisites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to match requisites to placeholders
CREATE OR REPLACE FUNCTION match_requisites(
  template_id uuid,
  user_id uuid
) RETURNS TABLE (
  placeholder_id uuid,
  requisite_value text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  placeholder_record RECORD;
  requisite_record RECORD;
  pattern_found boolean;
BEGIN
  FOR placeholder_record IN 
    SELECT p.id, p.name 
    FROM placeholders p 
    WHERE p.template_id = template_id 
    AND p.user_id = user_id
  LOOP
    pattern_found := false;
    
    -- Match name pattern
    IF NOT pattern_found AND placeholder_record.name ILIKE '%имя%' THEN
      SELECT r.id, r.value INTO requisite_record
      FROM requisites r
      WHERE r.user_id = user_id
      AND r.type = 'name'
      AND r.value ~ '^[A-ZА-ЯЁ][a-zа-яё]+\s[A-ZА-ЯЁ][a-zа-яё]+(?:\s[A-ZА-ЯЁ][a-zа-яё]+)?$'
      LIMIT 1;
      
      IF FOUND THEN
        pattern_found := true;
        RETURN QUERY SELECT placeholder_record.id, requisite_record.value;
      END IF;
    END IF;

    -- Match company name pattern
    IF NOT pattern_found AND placeholder_record.name ILIKE '%название%' THEN
      SELECT r.id, r.value INTO requisite_record
      FROM requisites r
      WHERE r.user_id = user_id
      AND r.type = 'company'
      AND r.value ~ '"[^"]*[A-ZА-ЯЁ][^"]*"'
      LIMIT 1;
      
      IF FOUND THEN
        pattern_found := true;
        RETURN QUERY SELECT placeholder_record.id, requisite_record.value;
      END IF;
    END IF;

    -- Match other patterns similarly...
    -- Add more pattern matching logic for other requisite types
    
  END LOOP;
END;
$$;