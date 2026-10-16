import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Abertura rápida de OS: cliente e carro podem existir só com o mínimo (a placa do carro).
 * Só RELAXA restrições (NOT NULL -> NULL); nenhum dado é perdido.
 *
 * Escrita à mão porque o `migration:generate` quebra com "Enum is not defined in column
 * fuel_type" ao mudar a nulidade de uma coluna varchar com `enum:` — o CHECK de fuel_type
 * continua valendo (NULL passa em CHECK ... IN, o SQL Server trata como desconhecido).
 */
export class PartialClientAndCarData1783700000000 implements MigrationInterface {
    name = 'PartialClientAndCarData1783700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "phone" varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "cpf" nvarchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "address" varchar(200) NULL`);

        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "brand" varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "model" varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "year" int NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "fuel_type" varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "color" varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "mileage_in" int NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "client_id" int NULL`);
    }

    // Só funciona se nenhuma linha tiver NULL nessas colunas (senão o SQL Server recusa).
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "client_id" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "mileage_in" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "color" varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "fuel_type" varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "year" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "model" varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cars" ALTER COLUMN "brand" varchar(255) NOT NULL`);

        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "address" varchar(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "cpf" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "phone" varchar(20) NOT NULL`);
    }
}
