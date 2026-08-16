CREATE TABLE "airing_schedule" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "airing_schedule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"anime_id" integer NOT NULL,
	"episode" integer NOT NULL,
	"airing_at" timestamp with time zone NOT NULL,
	CONSTRAINT "airing_schedule_episode_positive" CHECK ("airing_schedule"."episode" > 0)
);
--> statement-breakpoint
CREATE TABLE "anime" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "anime_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" integer NOT NULL,
	"title_romaji" text,
	"title_english" text,
	"title_native" text,
	"description" text,
	"cover_image" text,
	"banner_image" text,
	"format" text,
	"status" text,
	"episodes" integer,
	"duration" integer,
	"season" text,
	"season_year" integer,
	"average_score" integer,
	"popularity" integer,
	"trending" integer,
	"source" text,
	"country" text,
	"start_date" date,
	"end_date" date,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anime_episodes_nonnegative" CHECK ("anime"."episodes" IS NULL OR "anime"."episodes" >= 0),
	CONSTRAINT "anime_score_range" CHECK ("anime"."average_score" IS NULL OR "anime"."average_score" BETWEEN 0 AND 100),
	CONSTRAINT "anime_popularity_nonnegative" CHECK ("anime"."popularity" IS NULL OR "anime"."popularity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "anime_characters" (
	"anime_id" integer NOT NULL,
	"character_id" integer NOT NULL,
	"role" text DEFAULT 'SUPPORTING' NOT NULL,
	"voice_actor_id" integer,
	"voice_actor_language" text,
	CONSTRAINT "anime_characters_anime_id_character_id_pk" PRIMARY KEY("anime_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "anime_genres" (
	"anime_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "anime_genres_anime_id_genre_id_pk" PRIMARY KEY("anime_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "anime_relations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "anime_relations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"anime_id" integer NOT NULL,
	"related_anime_id" integer NOT NULL,
	"relation_type" text NOT NULL,
	CONSTRAINT "anime_relations_not_self" CHECK ("anime_relations"."anime_id" <> "anime_relations"."related_anime_id")
);
--> statement-breakpoint
CREATE TABLE "anime_staff" (
	"anime_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "anime_staff_anime_id_staff_id_pk" PRIMARY KEY("anime_id","staff_id")
);
--> statement-breakpoint
CREATE TABLE "anime_studios" (
	"anime_id" integer NOT NULL,
	"studio_id" integer NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	CONSTRAINT "anime_studios_anime_id_studio_id_pk" PRIMARY KEY("anime_id","studio_id")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "characters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_native" text,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "genres_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anime_id" integer NOT NULL,
	"score" numeric(3, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" >= 1 AND "ratings"."score" <= 10)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anime_id" integer NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"contains_spoiler" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" >= 1 AND "reviews"."rating" <= 10),
	CONSTRAINT "reviews_title_length" CHECK (char_length("reviews"."title") <= 200),
	CONSTRAINT "reviews_content_length" CHECK (char_length("reviews"."content") BETWEEN 20 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_native" text,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "studios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source" text NOT NULL,
	"operation" text NOT NULL,
	"target" text,
	"status" text NOT NULL,
	"message" text,
	"duration_ms" integer,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_anime_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anime_id" integer NOT NULL,
	"status" text DEFAULT 'PLANNING' NOT NULL,
	"current_episode" integer DEFAULT 0 NOT NULL,
	"started_at" date,
	"completed_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_anime_lists_episode_nonnegative" CHECK ("user_anime_lists"."current_episode" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_length" CHECK (char_length("users"."username") BETWEEN 3 AND 32)
);
--> statement-breakpoint
ALTER TABLE "airing_schedule" ADD CONSTRAINT "airing_schedule_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_characters" ADD CONSTRAINT "anime_characters_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_characters" ADD CONSTRAINT "anime_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_characters" ADD CONSTRAINT "anime_characters_voice_actor_id_staff_id_fk" FOREIGN KEY ("voice_actor_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_genres" ADD CONSTRAINT "anime_genres_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_genres" ADD CONSTRAINT "anime_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_relations" ADD CONSTRAINT "anime_relations_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_relations" ADD CONSTRAINT "anime_relations_related_anime_id_anime_id_fk" FOREIGN KEY ("related_anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_staff" ADD CONSTRAINT "anime_staff_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_staff" ADD CONSTRAINT "anime_staff_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_studios" ADD CONSTRAINT "anime_studios_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_studios" ADD CONSTRAINT "anime_studios_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_anime_lists" ADD CONSTRAINT "user_anime_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_anime_lists" ADD CONSTRAINT "user_anime_lists_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "airing_schedule_anime_episode_unique" ON "airing_schedule" USING btree ("anime_id","episode");--> statement-breakpoint
CREATE INDEX "airing_schedule_airing_at_idx" ON "airing_schedule" USING btree ("airing_at");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_external_id_unique" ON "anime" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "anime_title_romaji_idx" ON "anime" USING btree ("title_romaji");--> statement-breakpoint
CREATE INDEX "anime_title_english_idx" ON "anime" USING btree ("title_english");--> statement-breakpoint
CREATE INDEX "anime_average_score_idx" ON "anime" USING btree ("average_score");--> statement-breakpoint
CREATE INDEX "anime_popularity_idx" ON "anime" USING btree ("popularity");--> statement-breakpoint
CREATE INDEX "anime_season_year_idx" ON "anime" USING btree ("season_year");--> statement-breakpoint
CREATE INDEX "anime_characters_anime_id_idx" ON "anime_characters" USING btree ("anime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_relations_pair_unique" ON "anime_relations" USING btree ("anime_id","related_anime_id");--> statement-breakpoint
CREATE INDEX "anime_relations_anime_id_idx" ON "anime_relations" USING btree ("anime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_external_id_unique" ON "characters" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "characters_name_idx" ON "characters" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_slug_unique" ON "genres" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_anime_unique" ON "ratings" USING btree ("user_id","anime_id");--> statement-breakpoint
CREATE INDEX "ratings_anime_id_idx" ON "ratings" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "ratings_user_id_idx" ON "ratings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_anime_unique" ON "reviews" USING btree ("user_id","anime_id");--> statement-breakpoint
CREATE INDEX "reviews_anime_id_idx" ON "reviews" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_external_id_unique" ON "staff" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "staff_name_idx" ON "staff" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "studios_name_unique" ON "studios" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sync_logs_synced_at_idx" ON "sync_logs" USING btree ("synced_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_anime_lists_user_anime_unique" ON "user_anime_lists" USING btree ("user_id","anime_id");--> statement-breakpoint
CREATE INDEX "user_anime_lists_user_id_idx" ON "user_anime_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_anime_lists_anime_id_idx" ON "user_anime_lists" USING btree ("anime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER anime_updated_at BEFORE UPDATE ON "anime" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER user_anime_lists_updated_at BEFORE UPDATE ON "user_anime_lists" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER ratings_updated_at BEFORE UPDATE ON "ratings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
