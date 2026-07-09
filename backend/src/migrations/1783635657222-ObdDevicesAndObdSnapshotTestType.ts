import { MigrationInterface, QueryRunner } from "typeorm";

export class ObdDevicesAndObdSnapshotTestType1783635657222 implements MigrationInterface {
    name = 'ObdDevicesAndObdSnapshotTestType1783635657222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "obd_devices" ("device_id" int NOT NULL IDENTITY(1,1), "name" varchar(100) NOT NULL, "device_token" varchar(255) NOT NULL, "is_active" bit NOT NULL CONSTRAINT "DF_866280560c49ba62f643649e58d" DEFAULT 1, "last_ip" varchar(45), "last_seen_at" datetime, "last_reading" ntext, "last_reading_at" datetime, "pending_command" varchar(50), "created_at" datetime2 NOT NULL CONSTRAINT "DF_8463c5c9112c7cc1e1037901e1c" DEFAULT getdate(), "tenant_id" int NOT NULL, CONSTRAINT "UQ_3c6722ac6b0815a3bc0791392bf" UNIQUE ("device_token"), CONSTRAINT "PK_bf01a50aaa6d5337d6c405fc669" PRIMARY KEY ("device_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_463f30cc95b5aa93fab3ca3b1d" ON "obd_devices" ("tenant_id") `);
        await queryRunner.query(`ALTER TABLE "obd_devices" ADD CONSTRAINT "FK_463f30cc95b5aa93fab3ca3b1d4" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // O generate não detecta mudança no CORPO de um @Check existente (compara
        // pelo nome, que não mudou) — gotcha conhecido do SQL Server + TypeORM.
        // Adicionado manualmente: novo valor 'obd_snapshot' no enum de test_type.
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "check_values_test_type"`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "check_values_test_type" CHECK ("test_type" IN ('compressao_mecanica','leitura_dtc','bateria','injetores_banco','achado_adicional','antes_depois','obd_snapshot'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "check_values_test_type"`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "check_values_test_type" CHECK ("test_type" IN ('compressao_mecanica','leitura_dtc','bateria','injetores_banco','achado_adicional','antes_depois'))`);

        await queryRunner.query(`ALTER TABLE "obd_devices" DROP CONSTRAINT "FK_463f30cc95b5aa93fab3ca3b1d4"`);
        await queryRunner.query(`DROP INDEX "IDX_463f30cc95b5aa93fab3ca3b1d" ON "obd_devices"`);
        await queryRunner.query(`DROP TABLE "obd_devices"`);
    }

}
