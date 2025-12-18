DROP SCHEMA IF EXISTS app_data CASCADE;

CREATE SCHEMA app_data;

CREATE TABLE app_data.versions (
  id INTEGER NOT NULL
);

CREATE SEQUENCE app_data.versions_id_seq;

CREATE TABLE app_data.objects (
  id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE app_data.object_states (
  id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  object_id INTEGER NOT NULL,
  value INTEGER NULL DEFAULT NULL
);

ALTER TABLE ONLY app_data.versions
  ADD CONSTRAINT "pkey_versions" PRIMARY KEY (id);
ALTER TABLE ONLY app_data.objects
  ADD CONSTRAINT "pkey_objects" PRIMARY KEY (id, version_id);
CREATE INDEX "idx_objects_version_id" ON app_data.objects (version_id, id);
ALTER TABLE ONLY app_data.object_states
  ADD CONSTRAINT "pkey_object_states" PRIMARY KEY (id, version_id);
CREATE INDEX "idx_object_states_version_id" ON app_data.object_states (version_id, id);

ALTER TABLE ONLY app_data.objects
  ADD CONSTRAINT "fkey_objects_version_id" FOREIGN KEY (version_id) REFERENCES app_data.versions (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ONLY app_data.object_states
  ADD CONSTRAINT "fkey_object_states_version_id" FOREIGN KEY (version_id) REFERENCES app_data.versions (id) DEFERRABLE INITIALLY DEFERRED;

-- Default schema for Postgraphile follows

CREATE VIEW objects AS
WITH results AS MATERIALIZED (
  SELECT
    *
  FROM (
    SELECT DISTINCT ON (r.id)
      r.*
    FROM
      app_data.objects r
    WHERE
      r.version_id > 0
    ORDER BY
      r.id,
      r.version_id DESC
  ) v
) SELECT * FROM results;
COMMENT ON VIEW objects IS $$
@primaryKey id
$$;

CREATE VIEW object_states AS
WITH results AS MATERIALIZED (
  SELECT
    *
  FROM (
    SELECT DISTINCT ON (r.id)
      r.*
    FROM
      app_data.object_states r
    WHERE
      r.version_id > 0
    ORDER BY
      r.id,
      r.version_id DESC
  ) v
) SELECT * FROM results;
COMMENT ON VIEW object_states IS $$
@primaryKey id
@foreignKey (object_id) references objects (id)|@notNull|@fieldName object|@foreignFieldName states|The associated object.|
$$;

-- Generate sample data

DO $$
DECLARE
  v_i INTEGER;
BEGIN
  FOR v_i IN 1..10000 LOOP
    INSERT INTO app_data.versions (id) VALUES (v_i);
    INSERT INTO app_data.objects (id, version_id) VALUES (v_i, v_i);
    INSERT INTO app_data.object_states (id, version_id, object_id, value) VALUES (v_i, v_i, v_i, v_i);
  END LOOP;
END $$;
