-- Add a unique constraint so upserts can use ON CONFLICT(auth_user_id)
alter table if exists profiles
    add constraint profiles_auth_user_id_key unique (auth_user_id);
