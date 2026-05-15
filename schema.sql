create type item_type as enum (
  'TOPIC'
);

create table relational_items (
  id serial primary key,
  type item_type not null default 'TOPIC'::item_type,
  deleted_at timestamp with time zone
);

create table relational_topics (
  id int primary key references relational_items,
  title text not null
);

comment on table relational_items is $$
  @interface mode:relational type:type
  @type TOPIC references:relational_topics
  $$;