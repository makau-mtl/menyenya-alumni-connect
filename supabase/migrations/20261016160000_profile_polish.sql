-- Profile polish (16 Oct 2026, product owner): tidy names, a shared skills list for autocomplete.

-- Names typed all in capitals or all in lower case become "Grace Kerubo"; mixed case is kept as typed
-- (so "McDonald" or "wa Thiong'o" stay as the person wrote them).
create or replace function public.tidy_name(p text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when p is null then null
    when p = upper(p) or p = lower(p) then initcap(lower(regexp_replace(trim(p), '\s+', ' ', 'g')))
    else regexp_replace(trim(p), '\s+', ' ', 'g')
  end;
$$;

create or replace function public.tidy_person_name()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.full_name := public.tidy_name(new.full_name);
  return new;
end;
$$;

create trigger persons_tidy_name before insert or update of full_name on public.persons
  for each row execute function public.tidy_person_name();

update public.persons set full_name = public.tidy_name(full_name)
where full_name is distinct from public.tidy_name(full_name);

-- Skills members pick from (type to search, Enter to add). Administrators can add more later.
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index skills_name_key on public.skills (lower(name));
create trigger skills_updated_at before update on public.skills for each row execute function public.set_updated_at();
alter table public.skills enable row level security;
create policy "skills readable" on public.skills for select to anon, authenticated using (true);
create policy "skills admin insert" on public.skills for insert to authenticated with check (public.is_admin());
create policy "skills admin update" on public.skills for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.skills (category, name)
select c, unnest(s) from (values
  ('Finance and business', array['Accounting', 'Auditing', 'Bookkeeping', 'Budgeting', 'Business strategy', 'Business development', 'Banking', 'Credit analysis', 'Financial analysis', 'Financial reporting', 'Insurance', 'Investment', 'Microfinance', 'SACCO management', 'Tax', 'Payroll', 'Procurement', 'Supply chain', 'Logistics', 'Entrepreneurship', 'Small business management', 'Real estate', 'Property management', 'Sales', 'Customer service', 'Retail', 'Import and export']),
  ('Management and administration', array['Project management', 'Programme management', 'Monitoring and evaluation', 'Operations management', 'Human resources', 'Recruitment', 'Training and development', 'Office administration', 'Records management', 'Leadership', 'Strategic planning', 'Change management', 'Risk management', 'Compliance', 'Quality assurance', 'Governance', 'Fundraising', 'Grant writing', 'Event planning', 'Public administration', 'Policy analysis']),
  ('Technology', array['Software development', 'Web development', 'Mobile app development', 'Data analysis', 'Data science', 'Machine learning', 'Artificial intelligence', 'Database administration', 'Cloud computing', 'Cybersecurity', 'Networking', 'IT support', 'Systems administration', 'Product management', 'UX design', 'Graphic design', 'Digital marketing', 'Social media management', 'Search engine optimisation', 'Python', 'JavaScript', 'Java', 'SQL', 'Microsoft Excel', 'Microsoft Office', 'GIS', 'Electronics', 'Telecommunications']),
  ('Engineering and construction', array['Civil engineering', 'Structural engineering', 'Electrical engineering', 'Mechanical engineering', 'Water engineering', 'Architecture', 'Quantity surveying', 'Land surveying', 'Construction management', 'Building and masonry', 'Carpentry', 'Plumbing', 'Electrical installation', 'Welding', 'Interior design', 'Urban planning', 'Renewable energy', 'Solar installation', 'Automotive mechanics']),
  ('Health', array['Medicine', 'Nursing', 'Clinical medicine', 'Pharmacy', 'Dentistry', 'Public health', 'Nutrition', 'Laboratory science', 'Radiography', 'Physiotherapy', 'Mental health', 'Counselling', 'Community health', 'Health records', 'Midwifery', 'Veterinary medicine', 'First aid']),
  ('Education', array['Teaching', 'Curriculum development', 'Special needs education', 'Early childhood education', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Kiswahili', 'History', 'Geography', 'Christian religious education', 'Career guidance', 'Mentoring', 'Coaching', 'Tutoring', 'School administration', 'Research', 'Library science']),
  ('Law and public service', array['Law', 'Litigation', 'Conveyancing', 'Contract drafting', 'Legal research', 'Mediation', 'Human rights', 'Police and security', 'Military', 'Diplomacy', 'Community development', 'Social work']),
  ('Agriculture and environment', array['Agriculture', 'Agribusiness', 'Agronomy', 'Animal husbandry', 'Dairy farming', 'Poultry farming', 'Horticulture', 'Tea farming', 'Fisheries', 'Forestry', 'Environmental management', 'Climate change', 'Food processing', 'Food safety']),
  ('Communication and creative', array['Writing', 'Editing', 'Journalism', 'Public relations', 'Communications', 'Photography', 'Videography', 'Video editing', 'Music', 'Choir and conducting', 'Fine art', 'Fashion design', 'Tailoring', 'Translation', 'Public speaking', 'Broadcasting', 'Content creation']),
  ('Hospitality and services', array['Hospitality', 'Catering', 'Hotel management', 'Tourism', 'Cooking', 'Hairdressing and beauty', 'Driving', 'Transport', 'Aviation', 'Security services']),
  ('Ministry and community', array['Pastoral ministry', 'Youth ministry', 'Bible teaching', 'Church administration', 'Evangelism', 'Volunteer coordination', 'Counselling and guidance', 'Sports coaching', 'Football', 'Athletics'])
) as t(c, s)
on conflict do nothing;
