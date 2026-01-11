CREATE TYPE "public"."ActionEnum" AS ENUM('manage', 'create', 'read', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."SubjectEnum" AS ENUM('Post', 'User', 'all');--> statement-breakpoint
CREATE TABLE "Permission" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "ActionEnum" NOT NULL,
	"subject" "SubjectEnum" NOT NULL,
	"description" text,
	"conditions" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Post" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"authorId" integer NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RolePermission" (
	"roleId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	CONSTRAINT "RolePermission_roleId_permissionId_pk" PRIMARY KEY("roleId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "Role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "UserPermission" (
	"userId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	"inverted" boolean DEFAULT false NOT NULL,
	"reason" text,
	"assignedAt" timestamp (3) DEFAULT now() NOT NULL,
	"assignedBy" integer,
	"expiresAt" timestamp (3),
	CONSTRAINT "UserPermission_userId_permissionId_pk" PRIMARY KEY("userId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "UserRole" (
	"userId" integer NOT NULL,
	"roleId" integer NOT NULL,
	"assignedAt" timestamp (3) DEFAULT now() NOT NULL,
	"assignedBy" integer,
	"expiresAt" timestamp (3),
	CONSTRAINT "UserRole_userId_roleId_pk" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"deactivatedAt" timestamp (3),
	"deactivationReason" text,
	"deletedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"lastLoginAt" timestamp (3),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_Role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_Permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_Permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_assignedBy_User_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_Role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedBy_User_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Permission_action_idx" ON "Permission" USING btree ("action");--> statement-breakpoint
CREATE INDEX "Permission_subject_idx" ON "Permission" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "Post_authorId_idx" ON "Post" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "Post_isPublished_idx" ON "Post" USING btree ("isPublished");--> statement-breakpoint
CREATE INDEX "Post_authorId_isPublished_idx" ON "Post" USING btree ("authorId","isPublished");--> statement-breakpoint
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission" USING btree ("roleId");--> statement-breakpoint
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission" USING btree ("permissionId");--> statement-breakpoint
CREATE INDEX "Role_isActive_idx" ON "Role" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission" USING btree ("permissionId");--> statement-breakpoint
CREATE INDEX "UserPermission_inverted_idx" ON "UserPermission" USING btree ("inverted");--> statement-breakpoint
CREATE INDEX "UserPermission_expiresAt_idx" ON "UserPermission" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "UserPermission_assignedBy_idx" ON "UserPermission" USING btree ("assignedBy");--> statement-breakpoint
CREATE INDEX "UserRole_userId_idx" ON "UserRole" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserRole_roleId_idx" ON "UserRole" USING btree ("roleId");--> statement-breakpoint
CREATE INDEX "UserRole_expiresAt_idx" ON "UserRole" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "UserRole_assignedBy_idx" ON "UserRole" USING btree ("assignedBy");--> statement-breakpoint
CREATE INDEX "User_email_isActive_idx" ON "User" USING btree ("email","isActive");--> statement-breakpoint
CREATE INDEX "User_deletedAt_idx" ON "User" USING btree ("deletedAt");