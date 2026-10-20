import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A OS passa a guardar o próprio cliente (quem trouxe o carro nessa visita — opção A do Leonardo,
 * 2026-10-19). Toda OS existente recebe o dono atual do carro: nada muda no que já foi feito.
 */

export class ServiceOrderClient1792458430174 implements MigrationInterface {
    name = 'ServiceOrderClient1792458430174'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_orders" ADD "client_id" int`);
        await queryRunner.query(`CREATE INDEX "IDX_26c3dc95f5019d377fbd9c649a" ON "service_orders" ("client_id") `);
        await queryRunner.query(`ALTER TABLE "service_orders" ADD CONSTRAINT "FK_26c3dc95f5019d377fbd9c649a3" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE so SET so."client_id" = c."client_id" FROM "service_orders" so INNER JOIN "cars" c ON c."car_id" = so."car_id" WHERE so."client_id" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_orders" DROP CONSTRAINT "FK_26c3dc95f5019d377fbd9c649a3"`);
        await queryRunner.query(`DROP INDEX "IDX_26c3dc95f5019d377fbd9c649a" ON "service_orders"`);
        await queryRunner.query(`ALTER TABLE "service_orders" DROP COLUMN "client_id"`);
    }

}
