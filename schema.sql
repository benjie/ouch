create type task_type_enum as enum (
 'type_a',
 'type_b',
 'type_c',
 'type_d'
);

create table task (
  id   integer primary key generated always as identity,
  type task_type_enum not null
);

comment on table task is $$
@interface mode:relational type:type
@type type_a references:task_type_a
@type type_b references:task_type_b
@type type_c references:task_type_c
@type type_d references:task_type_d
$$;

create table task_type_a (
  id        integer primary key references task,
  content_a text
);

create table task_type_b (
  id        integer primary key references task,
  content_b text
);

create table task_type_c (
  id        integer primary key references task,
  content_c text
);

create table task_type_d (
  id        integer primary key references task,
  content_d text
);

create table task_status_log (
  id       integer primary key generated always as identity,
  task_id  integer not null references task,
  status   integer
);

comment on table task_status_log is $$
@unionMember TaskTimelineItem
$$;

create table task_comment (
  id       integer primary key generated always as identity,
  task_id  integer not null references task,
  content  text
);

comment on table task_comment is $$
@unionMember TaskTimelineItem
$$;

create table file (
  id   integer primary key generated always as identity,
  size integer,
  url  text
);

create table task_comment_file (
  id               integer primary key generated always as identity,
  task_comment_id  integer not null references task_comment,
  file_id          integer not null references file
);

create table task_timeline (
  id                 integer primary key generated always as identity,
  task_id            integer not null references task,
  task_comment_id    integer references task_comment,
  task_status_log_id integer references task_status_log
);

comment on table task_timeline is $$
@ref item to:TaskTimelineItem singular
@refVia item via:task_comment
@refVia item via:task_status_log
$$;

insert into task (type) values ('type_a');
insert into task_type_a (id) values ((select id from task));
insert into task_comment (task_id, content) values ((select id from task), 'sample content');
insert into file (size, url) values (100, 'sample url');
insert into task_comment_file (task_comment_id, file_id) values ((select id from task_comment), (select id from file));
insert into task_timeline (task_id, task_comment_id) values ((select id from task), (select id from task_comment));
