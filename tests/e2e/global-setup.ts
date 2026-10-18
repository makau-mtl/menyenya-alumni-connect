import { sql } from "./helpers";

// Open registration on the local test database, and make sure the lists the journeys need exist.
export default async function globalSetup() {
  sql("update public.module_settings set enabled = true where module_key = 'registration';");
  sql("insert into public.school_dorms (name) values ('Livingstone') on conflict (name) do nothing;");
}
