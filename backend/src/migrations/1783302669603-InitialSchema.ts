import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783302669603 implements MigrationInterface {
    name = 'InitialSchema1783302669603'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Baseline automático: se o banco já tem o schema (criado pelo
        // synchronize:true antigo — caso de dev e produção), não recria nada,
        // só deixa o TypeORM registrar esta migration como aplicada. Em banco
        // vazio (novo), segue e cria tudo. Assim migrationsRun:true funciona em
        // qualquer ambiente sem passo manual de baseline.
        const alreadyProvisioned = await queryRunner.hasTable('users');
        if (alreadyProvisioned) {
            return;
        }

        await queryRunner.query(`CREATE TABLE "email_verifications" ("id" int NOT NULL IDENTITY(1,1), "token" varchar(255) NOT NULL, "expires_at" datetime NOT NULL, "used_at" datetime, "user_id" int, CONSTRAINT "UQ_595be4c36e66b21d3fd14c73a24" UNIQUE ("token"), CONSTRAINT "PK_c1ea2921e767f83cd44c0af203f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("user_id" int NOT NULL IDENTITY(1,1), "name" nvarchar(150) NOT NULL, "email" nvarchar(100) NOT NULL, "password_hash" varchar(150) NOT NULL, "role" varchar(255) NOT NULL CONSTRAINT "DF_ace513fa30d485cfd25c11a9e4a" DEFAULT 'owner', "is_active" bit NOT NULL CONSTRAINT "DF_20c7aea6112bef71528210f631d" DEFAULT 0, "created_at" datetime2 NOT NULL CONSTRAINT "DF_c9b5b525a96ddc2c5647d7f7fa5" DEFAULT getdate(), "tenant_id" int, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "check_values_user_role" CHECK ("role" IN  ('owner','mechanic','receptionist')), CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "cars" ("car_id" int NOT NULL IDENTITY(1,1), "plate" varchar(7) NOT NULL, "brand" varchar(255) NOT NULL, "model" varchar(255) NOT NULL, "year" int NOT NULL, "fuel_type" varchar(255) CONSTRAINT CHK_206930d7609616c6f0778cf09d_ENUM CHECK(fuel_type IN ('flex','gasolina','diesel','eletrico')) NOT NULL, "chassis" varchar(255), "color" varchar(255) NOT NULL, "mileage_in" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_2555dc81dfd02577c74b1a7c3a2" DEFAULT getdate(), "client_id" int NOT NULL, "tenant_id" int NOT NULL, CONSTRAINT "PK_04ff4e14175e8eba19974f58ac8" PRIMARY KEY ("car_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a309ce7ba400919557999e69be" ON "cars" ("plate") `);
        await queryRunner.query(`CREATE INDEX "IDX_2e8dda5934d0c88ebdbabcb11f" ON "cars" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "clients" ("client_id" int NOT NULL IDENTITY(1,1), "name" varchar(150) NOT NULL, "phone" varchar(20) NOT NULL, "email" varchar(100), "cpf" nvarchar(255) NOT NULL, "address" varchar(200) NOT NULL, "date_of_birth" date, "is_active" bit NOT NULL CONSTRAINT "DF_ace902f8d642e90a66508af639e" DEFAULT 1, "created_at" datetime2 NOT NULL CONSTRAINT "DF_d18f039057f824490daaad22d4a" DEFAULT getdate(), "tenant_id" int NOT NULL, CONSTRAINT "PK_49e91f1e368e3f760789e7764aa" PRIMARY KEY ("client_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_99e921caf21faa2aab020476e4" ON "clients" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_4245ac34add1ceeb505efc9877" ON "clients" ("cpf") `);
        await queryRunner.query(`CREATE INDEX "IDX_e7d8b637725986e7b5fa774a3f" ON "clients" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" int NOT NULL IDENTITY(1,1), "name" nvarchar(255) NOT NULL, "cnpj" nvarchar(255) NOT NULL, "phone" nvarchar(255) NOT NULL, "plan" varchar(255) NOT NULL CONSTRAINT "DF_2c7d8d15b7cc219692e1765a00d" DEFAULT 'trial', "status" varchar(255) NOT NULL CONSTRAINT "DF_c59559e7872bc9726adef4669fb" DEFAULT 'trial', "trial_ends_at" datetime, "created_at" datetime2 NOT NULL CONSTRAINT "DF_1dba291f7611c0f2388055c40b4" DEFAULT getdate(), CONSTRAINT "check_values_tenant_status" CHECK ("status" IN ('trial','active','suspended')), CONSTRAINT "check_values_tenant_plan" CHECK ("plan" IN  ('trial','free','pro','full')), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_26fe9e78b4ffef8482a18369d2" ON "tenants" ("cnpj") `);
        await queryRunner.query(`CREATE TABLE "service_orders" ("service_order_id" int NOT NULL IDENTITY(1,1), "status" varchar(255) NOT NULL CONSTRAINT "DF_b8fe29acc71691af512c6eebb62" DEFAULT 'open', "public_token" varchar(255) NOT NULL, "client_complaint" text, "created_at" datetime2 NOT NULL CONSTRAINT "DF_175d9179031701cb5b645992a59" DEFAULT getdate(), "finished_at" datetime, "root_cause" text, "conclusion" text, "final_verdict" varchar(255), "promo_video_status" varchar(255) NOT NULL CONSTRAINT "DF_fbd9b3fad3dd4ee8998fec6e9e2" DEFAULT 'none', "mileage_in" int, "tenant_id" int NOT NULL, "car_id" int NOT NULL, "user_id" int NOT NULL, CONSTRAINT "UQ_97c2f778f6d10067d9cede22956" UNIQUE ("public_token"), CONSTRAINT "check_values_orders_promo_video_status" CHECK ("promo_video_status" IN ('none','processing','ready','failed')), CONSTRAINT "check_values_orders_final_verdict" CHECK ("final_verdict" IN ('resolved','not_resolved','partial')), CONSTRAINT "check_values_orders_status" CHECK ("status" IN  ('open','in_progress','done','cancelled')), CONSTRAINT "PK_74f778c4f840dff3f54878ed8f3" PRIMARY KEY ("service_order_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e99a96ef1cd0e804331ae20969" ON "service_orders" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "medias" ("media_id" int NOT NULL IDENTITY(1,1), "type" nvarchar(255) NOT NULL, "bucket" nvarchar(255) NOT NULL, "object_name" nvarchar(255) NOT NULL, "mime_type" nvarchar(255) NOT NULL, "size" int NOT NULL, "label" varchar(255), "created_at" datetime2 NOT NULL CONSTRAINT "DF_bb82120db46c46f78beb487344f" DEFAULT getdate(), "section_id" int NOT NULL, CONSTRAINT "check_values_media_type" CHECK ("type" IN ('photo','video','audio')), CONSTRAINT "PK_016d3e6d8b8a77211e30abf82c6" PRIMARY KEY ("media_id"))`);
        await queryRunner.query(`CREATE TABLE "sections" ("section_id" int NOT NULL IDENTITY(1,1), "type" varchar(255) NOT NULL CONSTRAINT "DF_53f6dbaac0ab64c8c00c8261443" DEFAULT 'checkin', "status" varchar(255) NOT NULL CONSTRAINT "DF_cb3e041fe2f8954bc737a538c39" DEFAULT 'draft', "notes" text, "published_at" datetime, "created_at" datetime2 NOT NULL CONSTRAINT "DF_32557a690983f452a99a60e0c1f" DEFAULT getdate(), "service_order_id" int NOT NULL, "published_by" int, CONSTRAINT "check_values_section_status" CHECK ("status" IN ('draft','published')), CONSTRAINT "check_values_section_type" CHECK ("type" IN ('intake','checkin','obd_scan','diagnosis','repair','preventive','final')), CONSTRAINT "PK_c5641bfa4992d9bb24205e4cf12" PRIMARY KEY ("section_id"))`);
        await queryRunner.query(`CREATE TABLE "tests" ("test_id" int NOT NULL IDENTITY(1,1), "title" varchar(150) NOT NULL, "measurements" ntext, "test_type" varchar(255), "data" ntext, "verdict" varchar(255), "notes" text, "created_at" datetime2 NOT NULL CONSTRAINT "DF_da019d1b027a4d12bfbbc68133c" DEFAULT getdate(), "section_id" int NOT NULL, CONSTRAINT "check_values_test_type" CHECK ("test_type" IN ('compressao_mecanica','leitura_dtc','bateria','injetores_banco','achado_adicional','antes_depois')), CONSTRAINT "check_values_test_verdict" CHECK ("verdict" IN ('approved','failed','inconclusive')), CONSTRAINT "PK_f8c701fbb2c6f4fb85cebfa0000" PRIMARY KEY ("test_id"))`);
        await queryRunner.query(`CREATE TABLE "password_resets" ("id" int NOT NULL IDENTITY(1,1), "token" varchar(255) NOT NULL, "expires_at" datetime NOT NULL, "used_at" datetime, "user_id" int, CONSTRAINT "UQ_9b34edd5264effbbc875c266a9e" UNIQUE ("token"), CONSTRAINT "PK_4816377aa98211c1de34469e742" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invites" ("id" int NOT NULL IDENTITY(1,1), "token" varchar(255) NOT NULL, "email" nvarchar(100) NOT NULL, "role" varchar(255) NOT NULL, "expires_at" datetime NOT NULL, "used_at" datetime, "created_at" datetime2 NOT NULL CONSTRAINT "DF_f5ba91f4f1aa6735fe494fde441" DEFAULT getdate(), "tenant_id" int, "invited_by" int, CONSTRAINT "UQ_18a9a6c85f7cc6f42ebef3b3188" UNIQUE ("token"), CONSTRAINT "check_values_invite_role" CHECK ("role" IN ('mechanic','receptionist')), CONSTRAINT "PK_aa52e96b44a714372f4dd31a0af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "email_verifications" ADD CONSTRAINT "FK_c4f1838323ae1dff5aa00148915" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cars" ADD CONSTRAINT "FK_911440d05b92b20dae536180e6b" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cars" ADD CONSTRAINT "FK_2e8dda5934d0c88ebdbabcb11f3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_e7d8b637725986e7b5fa774a3fd" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD CONSTRAINT "FK_e99a96ef1cd0e804331ae20969e" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD CONSTRAINT "FK_e0cab115e58d29ea1829cbb5ea1" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD CONSTRAINT "FK_f7680498e0f1a03041ef58ac9d8" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "medias" ADD CONSTRAINT "FK_0d48d0067b0fd55033085c17f90" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_dc0847079ff81a0f9a3da360b38" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_ed1d4352a3a5c4480254069b342" FOREIGN KEY ("published_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "FK_129d54f3302bb2991b74694a877" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_resets" ADD CONSTRAINT "FK_f7a4c3bc48f24df007936d217be" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_a3ad8c552d7c4c5320758376c1b" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_6e727f063d839c0090364ea95f3" FOREIGN KEY ("invited_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_6e727f063d839c0090364ea95f3"`);
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_a3ad8c552d7c4c5320758376c1b"`);
        await queryRunner.query(`ALTER TABLE "password_resets" DROP CONSTRAINT "FK_f7a4c3bc48f24df007936d217be"`);
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "FK_129d54f3302bb2991b74694a877"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_ed1d4352a3a5c4480254069b342"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_dc0847079ff81a0f9a3da360b38"`);
        await queryRunner.query(`ALTER TABLE "medias" DROP CONSTRAINT "FK_0d48d0067b0fd55033085c17f90"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP CONSTRAINT "FK_f7680498e0f1a03041ef58ac9d8"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP CONSTRAINT "FK_e0cab115e58d29ea1829cbb5ea1"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP CONSTRAINT "FK_e99a96ef1cd0e804331ae20969e"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_e7d8b637725986e7b5fa774a3fd"`);
        await queryRunner.query(`ALTER TABLE "cars" DROP CONSTRAINT "FK_2e8dda5934d0c88ebdbabcb11f3"`);
        await queryRunner.query(`ALTER TABLE "cars" DROP CONSTRAINT "FK_911440d05b92b20dae536180e6b"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
        await queryRunner.query(`ALTER TABLE "email_verifications" DROP CONSTRAINT "FK_c4f1838323ae1dff5aa00148915"`);
        await queryRunner.query(`DROP TABLE "invites"`);
        await queryRunner.query(`DROP TABLE "password_resets"`);
        await queryRunner.query(`DROP TABLE "tests"`);
        await queryRunner.query(`DROP TABLE "sections"`);
        await queryRunner.query(`DROP TABLE "medias"`);
        await queryRunner.query(`DROP INDEX "IDX_e99a96ef1cd0e804331ae20969" ON "service_orders"`);
        await queryRunner.query(`DROP TABLE "service_orders"`);
        await queryRunner.query(`DROP INDEX "IDX_26fe9e78b4ffef8482a18369d2" ON "tenants"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP INDEX "IDX_e7d8b637725986e7b5fa774a3f" ON "clients"`);
        await queryRunner.query(`DROP INDEX "IDX_4245ac34add1ceeb505efc9877" ON "clients"`);
        await queryRunner.query(`DROP INDEX "IDX_99e921caf21faa2aab020476e4" ON "clients"`);
        await queryRunner.query(`DROP TABLE "clients"`);
        await queryRunner.query(`DROP INDEX "IDX_2e8dda5934d0c88ebdbabcb11f" ON "cars"`);
        await queryRunner.query(`DROP INDEX "IDX_a309ce7ba400919557999e69be" ON "cars"`);
        await queryRunner.query(`DROP TABLE "cars"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "email_verifications"`);
    }

}
