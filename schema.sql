drop schema if exists app_public cascade;
create schema app_public;

create table app_public.a (
    id serial primary key,
    name text not null
);

create table app_public.b (
    id serial primary key,
    description text
);

create table app_public.c (
    id serial primary key,
    a_id integer references app_public.a(id),
    b_id integer references app_public.b(id)
);

insert into app_public.a (name) values ('Alice'), ('Bob');
insert into app_public.b (description) values ('First B'), ('Second B'), ('Third B');
insert into app_public.c (a_id, b_id) values (1, 1), (1, 2), (2, 3);