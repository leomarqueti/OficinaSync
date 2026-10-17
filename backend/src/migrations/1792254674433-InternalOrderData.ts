import { MigrationInterface, QueryRunner } from "typeorm";

export class InternalOrderData1792254674433 implements MigrationInterface {
    name = 'InternalOrderData1792254674433'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "service_order_parts" ("part_id" int NOT NULL IDENTITY(1,1), "description" varchar(150) NOT NULL, "code" varchar(60), "taken_quantity" decimal(10,2) NOT NULL, "used_quantity" decimal(10,2), "unit_price" decimal(10,2), "photo_object_name" varchar(255), "photo_mime" varchar(100), "photo_size" int, "created_at" datetime2 NOT NULL CONSTRAINT "DF_a7cc923b677a70d7929cb508cb4" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_3395818d083cdb4777338bb2669" DEFAULT getdate(), "service_order_id" int NOT NULL, "tenant_id" int NOT NULL, "created_by_user_id" int, CONSTRAINT "PK_e036529541d2679d70dd99e1618" PRIMARY KEY ("part_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2fc212508d9324e30867d48029" ON "service_order_parts" ("service_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_91529a13c3c22558754482b9d9" ON "service_order_parts" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "service_order_participants" ("participant_id" int NOT NULL IDENTITY(1,1), "share_percent" int NOT NULL, "task" varchar(150) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_631ce7d5481254b5e96b33a8dc1" DEFAULT getdate(), "service_order_id" int NOT NULL, "tenant_id" int NOT NULL, "user_id" int NOT NULL, CONSTRAINT "UQ_participant_order_user" UNIQUE ("service_order_id", "user_id"), CONSTRAINT "PK_4bbae4469105a4474f610eb4e66" PRIMARY KEY ("participant_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b53c3a7596ce4eb0b38dc3d72" ON "service_order_participants" ("service_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_70beb92da84a7338af98b202f7" ON "service_order_participants" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "service_order_services" ("service_id" int NOT NULL IDENTITY(1,1), "description" varchar(200) NOT NULL, "price" decimal(10,2), "created_at" datetime2 NOT NULL CONSTRAINT "DF_df5e8cb7854283c2e36eab884d1" DEFAULT getdate(), "service_order_id" int NOT NULL, "tenant_id" int NOT NULL, "created_by_user_id" int, CONSTRAINT "PK_c56fd366ca400e25156a0ac184f" PRIMARY KEY ("service_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_773daff3326b52a6743fe3dfd2" ON "service_order_services" ("service_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_761ec0bff87091647deb3cf5e4" ON "service_order_services" ("tenant_id") `);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD "internal_notes" nvarchar(max)`);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD "responsible_user_id" int`);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD CONSTRAINT "FK_8e54d1ce5871e7254847b23e17b" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" ADD CONSTRAINT "FK_2fc212508d9324e30867d480295" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" ADD CONSTRAINT "FK_91529a13c3c22558754482b9d98" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" ADD CONSTRAINT "FK_d04750ad5b5c49c0eedfb167566" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" ADD CONSTRAINT "FK_1b53c3a7596ce4eb0b38dc3d726" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" ADD CONSTRAINT "FK_70beb92da84a7338af98b202f77" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" ADD CONSTRAINT "FK_de01bff858e6f123fb12fe80fe2" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_services" ADD CONSTRAINT "FK_773daff3326b52a6743fe3dfd2c" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_services" ADD CONSTRAINT "FK_761ec0bff87091647deb3cf5e4a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_order_services" ADD CONSTRAINT "FK_6eb68afef9e1f8be7062c1a8c48" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_order_services" DROP CONSTRAINT "FK_6eb68afef9e1f8be7062c1a8c48"`);
        await queryRunner.query(`ALTER TABLE "service_order_services" DROP CONSTRAINT "FK_761ec0bff87091647deb3cf5e4a"`);
        await queryRunner.query(`ALTER TABLE "service_order_services" DROP CONSTRAINT "FK_773daff3326b52a6743fe3dfd2c"`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" DROP CONSTRAINT "FK_de01bff858e6f123fb12fe80fe2"`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" DROP CONSTRAINT "FK_70beb92da84a7338af98b202f77"`);
        await queryRunner.query(`ALTER TABLE "service_order_participants" DROP CONSTRAINT "FK_1b53c3a7596ce4eb0b38dc3d726"`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" DROP CONSTRAINT "FK_d04750ad5b5c49c0eedfb167566"`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" DROP CONSTRAINT "FK_91529a13c3c22558754482b9d98"`);
        await queryRunner.query(`ALTER TABLE "service_order_parts" DROP CONSTRAINT "FK_2fc212508d9324e30867d480295"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP CONSTRAINT "FK_8e54d1ce5871e7254847b23e17b"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP COLUMN "responsible_user_id"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP COLUMN "internal_notes"`);
        await queryRunner.query(`DROP INDEX "IDX_761ec0bff87091647deb3cf5e4" ON "service_order_services"`);
        await queryRunner.query(`DROP INDEX "IDX_773daff3326b52a6743fe3dfd2" ON "service_order_services"`);
        await queryRunner.query(`DROP TABLE "service_order_services"`);
        await queryRunner.query(`DROP INDEX "IDX_70beb92da84a7338af98b202f7" ON "service_order_participants"`);
        await queryRunner.query(`DROP INDEX "IDX_1b53c3a7596ce4eb0b38dc3d72" ON "service_order_participants"`);
        await queryRunner.query(`DROP TABLE "service_order_participants"`);
        await queryRunner.query(`DROP INDEX "IDX_91529a13c3c22558754482b9d9" ON "service_order_parts"`);
        await queryRunner.query(`DROP INDEX "IDX_2fc212508d9324e30867d48029" ON "service_order_parts"`);
        await queryRunner.query(`DROP TABLE "service_order_parts"`);
    }

}
