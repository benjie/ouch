create table system_credentials (
  id int primary key generated always as identity,
  name text not null unique,
  value text not null
);

comment on column system_credentials.value is '@behavior -*';
