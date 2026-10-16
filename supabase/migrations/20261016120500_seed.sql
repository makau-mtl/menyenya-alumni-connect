-- Starting data. SPEC §18. All of it is admin-editable afterwards.

insert into public.member_categories (key, name, description, required_fields, sort_order) values
  ('alumnus', 'Alumnus', 'A former student of Menyenya SDA High School', '["year_left", "class_or_stream"]', 1),
  ('friend', 'Friend of the alumni', 'A parent, teacher, neighbour or supporter of the school', '["relationship_to_school"]', 2);

-- Fees are off (0) until members decide; levels are by life stage, not age.
insert into public.membership_levels (name, description, can_mentor, can_request_mentor, sort_order) values
  ('Foundation', 'For students and those starting out. Stay connected and find a mentor.', false, true, 1),
  ('Launch', 'For early-career alumni building their path. Networking and mentorship.', false, true, 2),
  ('Growth', 'For established professionals and business owners. Mentor others and lead initiatives.', true, false, 3),
  ('Impact', 'For those able to give significantly of time and resources. Shape the association''s direction.', true, false, 4);

insert into public.clusters (name, sort_order) values
  ('Nairobi', 1), ('Kisii', 2), ('Nyamira', 3), ('Nakuru', 4), ('Eldoret', 5), ('Kisumu', 6), ('Mombasa', 7), ('Diaspora', 8);

insert into public.counties (name, sort_order)
select name, ord from unnest(array[
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang''a', 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot', 'Outside Kenya'
]) with ordinality as t(name, ord);

insert into public.cohorts (year_left, label)
select y, 'Class of ' || y from generate_series(1975, 2026) as y;

insert into public.roles (key, name, description, allowed_scope_types) values
  ('member', 'Member', 'Profile, directory, events, giving history', '{association}'),
  ('cohort_rep', 'Class rep', 'Verify and manage members of their class; class dashboard', '{cohort}'),
  ('cluster_rep', 'Cluster rep', 'Manage members of their regional cluster; cluster dashboard', '{cluster}'),
  ('verifier', 'Verifier', 'Verify friends of the alumni and resolve duplicate records', '{association}'),
  ('chair', 'Chairman', 'Final approvals, association-wide events, all reports', '{association}'),
  ('vice_chair', 'Vice Chairman', 'Deputises for the Chairman', '{association}'),
  ('secretary', 'Secretary', 'Governance records, meetings, minutes, official communication', '{association}'),
  ('treasurer', 'Treasurer', 'Payment entry and reconciliation, disbursements, financial reports', '{association}'),
  ('welfare_coordinator', 'Welfare Coordinator', 'Welfare cases (only when the welfare module is on)', '{association}'),
  ('events_coordinator', 'Events Coordinator', 'Approves class and cluster events', '{association}'),
  ('committee_member', 'Committee member', 'Works within a committee''s remit', '{committee}'),
  ('admin', 'Administrator', 'Users, roles, configuration and data quality', '{association}'),
  ('school_liaison', 'School liaison', 'Student nominations, school approvals, project updates', '{school}');

insert into public.committees (name, purpose) values
  ('Technical Committee', 'Guides the association''s projects and approves proposals before they are acted on');

-- Accounts. Paybill and bank details are added when each institution confirms them.
insert into public.payment_channels (key, name, holder, account_display_name) values
  ('bom-tuition', 'BoM Tuition Block Paybill', 'school_bom',
   'Menyenya SDA High School Board of Management, Tuition Block project account'),
  ('association', 'Association Paybill', 'association', 'Menyenya SDA High School Alumni Association account');

insert into public.funds (key, name, channel_id) values
  ('tuition-block-fund', 'Tuition Block Fund', (select id from public.payment_channels where key = 'bom-tuition')),
  ('general-fund', 'Menyenya Alumni Fund', (select id from public.payment_channels where key = 'association')),
  ('needy-students-fund', 'Needy Students Fund', (select id from public.payment_channels where key = 'association'));

insert into public.causes (
  slug, title, summary, story, components, readiness, kind, fund_id, target_amount, lifecycle, visibility,
  pledges_enabled, preset_amounts, recurring_periods, suggested_pledges, sort_order
) values
(
  'tuition-block', 'The tuition block',
  'A modern tuition block with a library, computer laboratories, classrooms and offices, raised by alumni over three years.',
  '["At our plenary on 20 September 2026, members agreed to raise KES 100 million over three years for a new tuition block at Menyenya SDA High School.",
    "The block brings together the spaces students need most: a library for quiet study, at least two computer laboratories, more classrooms to ease crowding, and offices to run them.",
    "Before the campaign launches, we are putting the foundations in place: the association''s registration, an agreement with the school, and a dedicated project account held by the school''s Board of Management."]',
  '[{"name": "Library", "purpose": "Reference materials, quiet study and research"},
    {"name": "Computer laboratories", "purpose": "At least two, for ICT lessons, digital skills and computer-based exams"},
    {"name": "Classrooms", "purpose": "Ease crowding in existing classrooms"},
    {"name": "Offices", "purpose": "To run the library, ICT and the block"}]',
  '[{"label": "Members agree the project at the plenary", "done": true},
    {"label": "Founding pledges from members", "done": true},
    {"label": "Association registration certificate", "done": false},
    {"label": "Alumni–School agreement (MOU) signed", "done": false},
    {"label": "Board of Management project account and Paybill confirmed", "done": false},
    {"label": "Alumni representative named to the school''s project committee", "done": false},
    {"label": "Official launch", "done": false}]',
  'campaign', (select id from public.funds where key = 'tuition-block-fund'), 100000000, 'preparation', 'public',
  true, '{1000, 2500, 5000, 10000, 50000}', '{monthly, quarterly, annually}',
  '[{"label": "KES 1,000 a month for 3 years", "perPeriod": 1000, "periods": 36, "period": "monthly"},
    {"label": "KES 2,500 a month for 3 years", "perPeriod": 2500, "periods": 36, "period": "monthly", "sweetSpot": true},
    {"label": "KES 5,000 a month for 3 years", "perPeriod": 5000, "periods": 36, "period": "monthly"},
    {"label": "KES 100,000 once", "perPeriod": 100000, "periods": 1, "period": "one_time"}]',
  1
),
(
  'alumni-fund', 'Menyenya Alumni Fund',
  'Flexible support for the association''s work and the school''s urgent needs, directed by elected leaders and reported to members.',
  '["Gifts to this fund support the association''s work: running costs, events that bring alumni together, and urgent needs at the school.",
    "Every shilling is recorded and reported in the association''s annual financial report."]',
  '[]', '[]', 'general', (select id from public.funds where key = 'general-fund'), null, 'live', 'public',
  false, '{500, 1000, 2500, 5000}', '{monthly, annually}', '[]', 2
),
(
  'keep-a-child-in-school', 'Keep a child in school',
  'Help a student whose family cannot meet school fees stay in class. Students are never named publicly.',
  '["Some students at Menyenya miss school because fees are unpaid. This fund helps them stay in class.",
    "Students are chosen with the school, and their names are never shown publicly."]',
  '[]', '[]', 'ongoing_fund', (select id from public.funds where key = 'needy-students-fund'), null, 'live', 'public',
  true, '{1000, 5000, 10000, 25000}', '{monthly, quarterly, annually}', '[]', 3
);

-- The plenary's founding pledges (18 members, KES 3.41M), until each is imported individually.
insert into public.cause_offline_pledges (cause_id, pledged_total, pledge_count, recorded_on, note) values
  ((select id from public.causes where slug = 'tuition-block'), 3410000, 18, '2026-09-20',
   'Founding pledges made at the plenary on 20 September 2026');
